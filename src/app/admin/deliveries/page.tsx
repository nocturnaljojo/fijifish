export const dynamic = "force-dynamic";

import { createServerSupabaseClient } from "@/lib/supabase";
import Link from "next/link";

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  planned:   { label: "Planned",   cls: "bg-white/5 border border-white/15 text-text-secondary" },
  active:    { label: "Active",    cls: "bg-ocean-teal/10 border border-ocean-teal/30 text-ocean-teal" },
  completed: { label: "Completed", cls: "bg-lagoon-green/10 border border-lagoon-green/30 text-lagoon-green" },
};

interface WindowGroup {
  window_id: string;
  flight_number: string | null;
  flight_date: string;
  window_status: string;
  runs: RunRow[];
}

interface RunRow {
  id: string;
  status: string;
  driver_name: string;
  stop_count: number | null;
  stops_total: number;
  stops_delivered: number;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

async function getData(): Promise<WindowGroup[]> {
  try {
    const supabase = createServerSupabaseClient();

    const [{ data: runs }, { data: windows }] = await Promise.all([
      supabase
        .from("delivery_runs")
        .select(`
          id, status, stop_count, created_at, started_at, completed_at,
          flight_window_id,
          drivers(users:user_id(full_name))
        `)
        .order("created_at", { ascending: false }),
      supabase
        .from("flight_windows")
        .select("id, flight_number, flight_date, status")
        .order("flight_date", { ascending: false }),
    ]);

    if (!runs?.length) return [];

    const runIds = runs.map((r) => r.id);
    const { data: stops } = await supabase
      .from("delivery_stops")
      .select("delivery_run_id, status")
      .in("delivery_run_id", runIds);

    const stopMap: Record<string, { total: number; delivered: number }> = {};
    for (const s of stops ?? []) {
      if (!stopMap[s.delivery_run_id]) stopMap[s.delivery_run_id] = { total: 0, delivered: 0 };
      stopMap[s.delivery_run_id].total++;
      if (s.status === "delivered") stopMap[s.delivery_run_id].delivered++;
    }

    // Group runs by flight window
    const windowMap = new Map<string, WindowGroup>();
    for (const w of windows ?? []) {
      windowMap.set(w.id, {
        window_id: w.id,
        flight_number: w.flight_number,
        flight_date: w.flight_date,
        window_status: w.status,
        runs: [],
      });
    }

    for (const run of runs) {
      const driversRaw = run.drivers as unknown;
      const driverObj = Array.isArray(driversRaw) ? (driversRaw[0] ?? null) : driversRaw;
      const usersRaw = (driverObj as { users?: unknown } | null)?.users;
      const userObj = Array.isArray(usersRaw) ? (usersRaw[0] ?? null) : usersRaw;
      const driverName = (userObj as { full_name?: string | null } | null)?.full_name ?? "Unknown driver";

      const progress = stopMap[run.id] ?? { total: run.stop_count ?? 0, delivered: 0 };

      const runRow: RunRow = {
        id: run.id,
        status: run.status,
        driver_name: driverName,
        stop_count: run.stop_count,
        stops_total: progress.total,
        stops_delivered: progress.delivered,
        created_at: run.created_at,
        started_at: run.started_at,
        completed_at: run.completed_at,
      };

      const group = windowMap.get(run.flight_window_id);
      if (group) {
        group.runs.push(runRow);
      } else {
        // Run's window isn't in our list — create a stub
        windowMap.set(run.flight_window_id, {
          window_id: run.flight_window_id,
          flight_number: null,
          flight_date: "—",
          window_status: "unknown",
          runs: [runRow],
        });
      }
    }

    return Array.from(windowMap.values()).filter((g) => g.runs.length > 0);
  } catch {
    return [];
  }
}

async function getAssignableWindows() {
  try {
    const supabase = createServerSupabaseClient();
    const { data } = await supabase
      .from("flight_windows")
      .select("id, flight_number, flight_date, status")
      .in("status", ["closed", "packing", "shipped", "in_transit", "landed", "customs", "delivering"])
      .order("flight_date", { ascending: false });
    return data ?? [];
  } catch {
    return [];
  }
}

export default async function DeliveriesPage() {
  const [groups, assignableWindows] = await Promise.all([getData(), getAssignableWindows()]);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-xs font-mono text-text-secondary uppercase tracking-widest mb-1">Admin</p>
          <h1 className="text-2xl font-bold text-text-primary">Delivery Runs</h1>
          <p className="text-text-secondary text-sm mt-1">
            Assign drivers and sequence stops for each flight window.
          </p>
        </div>
      </div>

      {/* Create run CTAs — one per assignable window */}
      {assignableWindows.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xs font-mono text-text-secondary uppercase tracking-widest mb-3">
            Create New Run
          </h2>
          <div className="flex flex-col gap-2">
            {assignableWindows.map((w) => {
              const dateLabel = new Date(w.flight_date + "T00:00:00").toLocaleDateString("en-AU", {
                weekday: "short", day: "numeric", month: "short", year: "numeric",
              });
              return (
                <div
                  key={w.id}
                  className="flex items-center justify-between gap-4 bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3"
                >
                  <div>
                    <p className="font-semibold text-text-primary text-sm">
                      {w.flight_number ?? "—"} · {dateLabel}
                    </p>
                    <p className="text-xs font-mono text-text-secondary capitalize mt-0.5">{w.status}</p>
                  </div>
                  <Link
                    href={`/admin/deliveries/create/${w.id}`}
                    className="shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-ocean-teal text-bg-primary text-sm font-bold hover:opacity-90 transition-opacity"
                  >
                    + Assign Delivery
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Run history grouped by window */}
      {groups.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-white/15 rounded-xl">
          <span className="text-4xl block mb-3" aria-hidden="true">🚛</span>
          <p className="text-text-primary font-semibold mb-1">No delivery runs yet</p>
          <p className="text-text-secondary text-sm">
            Create a run for a flight window above once orders are confirmed.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {groups.map((group) => {
            const dateLabel =
              group.flight_date === "—"
                ? "—"
                : new Date(group.flight_date + "T00:00:00").toLocaleDateString("en-AU", {
                    weekday: "short", day: "numeric", month: "short", year: "numeric",
                  });

            return (
              <div key={group.window_id}>
                <div className="flex items-center gap-3 mb-3">
                  <h2 className="text-sm font-mono text-text-secondary uppercase tracking-widest">
                    {group.flight_number ?? "—"} · {dateLabel}
                  </h2>
                  <span className="text-xs font-mono text-text-secondary/50 capitalize">
                    {group.window_status}
                  </span>
                </div>

                <div className="flex flex-col gap-3">
                  {group.runs.map((run) => {
                    const badge = STATUS_BADGE[run.status] ?? STATUS_BADGE.planned;
                    const pct =
                      run.stops_total > 0
                        ? Math.round((run.stops_delivered / run.stops_total) * 100)
                        : 0;
                    const dateStr = new Date(run.created_at).toLocaleDateString("en-AU", {
                      day: "numeric", month: "short", year: "numeric",
                    });

                    return (
                      <div
                        key={run.id}
                        className="bg-white/[0.03] border border-white/10 rounded-xl p-4 flex flex-col gap-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-text-primary text-sm">{run.driver_name}</p>
                            <p className="text-xs text-text-secondary mt-0.5">Created {dateStr}</p>
                          </div>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono ${badge.cls}`}
                          >
                            {badge.label}
                          </span>
                        </div>

                        {/* Progress */}
                        <div>
                          <div className="flex items-center justify-between text-xs text-text-secondary mb-1.5">
                            <span>{run.stops_delivered} / {run.stops_total} stops delivered</span>
                            <span>{pct}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-white/10 rounded-full">
                            <div
                              className="h-1.5 rounded-full bg-lagoon-green transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>

                        {run.completed_at && (
                          <p className="text-xs text-text-secondary/50 font-mono">
                            Completed{" "}
                            {new Date(run.completed_at).toLocaleString("en-AU", {
                              day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                            })}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
