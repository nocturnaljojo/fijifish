import { createServerSupabaseClient } from "@/lib/supabase";
import { getActiveFlightWindow, getWindowInventory, calcCargoPercent } from "@/lib/flight-windows";
import Link from "next/link";

interface ActiveRun {
  id: string;
  status: string;
  started_at: string | null;
  stop_count: number | null;
  drivers: {
    users: { full_name: string | null } | null;
  } | null;
  stops: {
    status: string;
    sequence_number: number;
    address: string | null;
  }[];
}

async function getActiveRuns(): Promise<ActiveRun[]> {
  try {
    const supabase = createServerSupabaseClient();
    const { data: runs } = await supabase
      .from("delivery_runs")
      .select(`
        id, status, started_at, stop_count,
        drivers(users:user_id(full_name))
      `)
      .eq("status", "active")
      .order("started_at", { ascending: false });

    if (!runs?.length) return [];

    const runIds = runs.map((r) => r.id);
    const { data: stops } = await supabase
      .from("delivery_stops")
      .select("delivery_run_id, status, sequence_number, address")
      .in("delivery_run_id", runIds)
      .order("sequence_number", { ascending: true });

    return runs.map((run) => ({
      ...run,
      drivers: run.drivers as unknown as { users: { full_name: string | null } | null } | null,
      stops: (stops ?? []).filter((s) => s.delivery_run_id === run.id),
    }));
  } catch {
    return [];
  }
}

async function getDashboardStats() {
  try {
    const supabase = createServerSupabaseClient();
    const [usersRes, ordersRes] = await Promise.all([
      supabase.from("users").select("id", { count: "exact", head: true }),
      supabase
        .from("orders")
        .select("id, total_aud_cents, status")
        .in("status", ["confirmed", "paid", "delivered"]),
    ]);
    return {
      userCount: usersRes.count ?? 0,
      orders: ordersRes.data ?? [],
    };
  } catch {
    return { userCount: 0, orders: [] };
  }
}

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-5 flex flex-col gap-2">
      <p className="text-xs font-mono text-text-secondary uppercase tracking-widest">{label}</p>
      <p
        className="text-3xl font-bold font-mono"
        style={{ color: accent ?? "var(--ocean-teal, #4fc3f7)" }}
      >
        {value}
      </p>
      {sub && <p className="text-xs text-text-secondary">{sub}</p>}
    </div>
  );
}

export default async function AdminDashboard() {
  const [stats, activeWindow, activeRuns] = await Promise.all([
    getDashboardStats(),
    getActiveFlightWindow(),
    getActiveRuns(),
  ]);

  const inventory = activeWindow ? await getWindowInventory(activeWindow.id) : [];
  const cargoPercent = calcCargoPercent(inventory) ?? 0;

  const totalRevenue = stats.orders.reduce((s, o) => s + o.total_aud_cents, 0);
  const revenueLabel = `A$${(totalRevenue / 100).toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <p className="text-xs font-mono text-text-secondary uppercase tracking-widest mb-1">
          FijiFish Admin
        </p>
        <h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total revenue" value={revenueLabel} sub="All confirmed orders" accent="#ffab40" />
        <StatCard label="Registered users" value={String(stats.userCount)} sub="Buyers, suppliers, drivers" />
        <StatCard label="Total orders" value={String(stats.orders.length)} sub="Confirmed + paid + delivered" accent="#66bb6a" />
        <StatCard label="Cargo fill" value={`${cargoPercent}%`} sub={activeWindow ? "Active window" : "No active window"} accent={cargoPercent >= 80 ? "#ff7043" : "#ffab40"} />
      </div>

      {/* Active flight window */}
      <div className="mb-8">
        <h2 className="text-sm font-mono text-text-secondary uppercase tracking-widest mb-3">
          Active Flight Window
        </h2>
        {activeWindow ? (
          <div className="bg-white/5 border border-white/10 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="inline-block w-2 h-2 rounded-full animate-pulse"
                  style={{ background: activeWindow.status === "open" ? "#66bb6a" : "#ffab40" }}
                  aria-hidden="true"
                />
                <span className="text-xs font-mono uppercase tracking-widest text-text-secondary">
                  {activeWindow.status}
                </span>
              </div>
              <p className="font-bold text-text-primary text-lg">
                {activeWindow.flight_number ?? "FJ911"} — {activeWindow.flight_date}
              </p>
              <p className="text-sm text-text-secondary mt-0.5">
                Order close:{" "}
                {new Date(activeWindow.order_close_at).toLocaleString("en-AU", {
                  dateStyle: "medium",
                  timeStyle: "short",
                  timeZone: "Australia/Sydney",
                })}{" "}
                AEST
              </p>
            </div>
            <Link
              href="/admin/windows"
              className="shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-ocean-teal/30 text-ocean-teal text-sm font-medium hover:bg-ocean-teal/5 transition-colors"
            >
              Manage windows →
            </Link>
          </div>
        ) : (
          <div className="bg-white/5 border border-dashed border-white/20 rounded-xl p-6 text-center">
            <p className="text-text-secondary text-sm mb-3">No active flight window</p>
            <Link
              href="/admin/windows"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-ocean-teal text-bg-primary text-sm font-bold hover:opacity-90 transition-opacity"
            >
              + Create Flight Window
            </Link>
          </div>
        )}
      </div>

      {/* Active deliveries */}
      {activeRuns.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-mono text-text-secondary uppercase tracking-widest mb-3">
            Active Deliveries
          </h2>
          <div className="flex flex-col gap-3">
            {activeRuns.map((run) => {
              const driverName = run.drivers?.users?.full_name ?? "Unknown driver";
              const deliveredCount = run.stops.filter((s) => s.status === "delivered").length;
              const totalStops = run.stop_count ?? run.stops.length;
              const currentStop = run.stops.find(
                (s) => s.status === "arrived" || s.status === "pending",
              );
              const progressPct = totalStops > 0 ? Math.round((deliveredCount / totalStops) * 100) : 0;

              return (
                <div key={run.id} className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <p className="font-semibold text-text-primary text-sm">{driverName}</p>
                      {run.started_at && (
                        <p className="text-xs text-text-secondary mt-0.5">
                          Started{" "}
                          {new Date(run.started_at).toLocaleTimeString("en-AU", {
                            hour: "2-digit",
                            minute: "2-digit",
                            timeZone: "Australia/Sydney",
                          })}
                        </p>
                      )}
                    </div>
                    <span className="text-xs font-mono text-ocean-teal bg-ocean-teal/10 border border-ocean-teal/20 px-2 py-0.5 rounded-full shrink-0">
                      {deliveredCount}/{totalStops} stops
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-1.5 bg-white/10 rounded-full mb-3">
                    <div
                      className="h-1.5 rounded-full bg-lagoon-green transition-all"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>

                  {currentStop && (
                    <p className="text-xs text-text-secondary">
                      Current stop #{currentStop.sequence_number}
                      {currentStop.address ? ` · ${currentStop.address}` : ""}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div>
        <h2 className="text-sm font-mono text-text-secondary uppercase tracking-widest mb-3">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            { href: "/admin/windows", label: "Create Flight Window", icon: "✈️", desc: "Set order window, close time, flight number" },
            { href: "/admin/pricing", label: "Set Prices & Capacity", icon: "💰", desc: "AUD/FJD prices and kg per species" },
            { href: "/admin/photos", label: "Approve Catch Photos", icon: "📷", desc: "Review supplier photo submissions" },
            { href: "/admin/stories", label: "Publish Impact Story", icon: "🌿", desc: "Share village revenue impact" },
            { href: "/admin/customers", label: "View Customers", icon: "👥", desc: "List and export registered buyers" },
            { href: "/admin/broadcasts", label: "Send Broadcast", icon: "📣", desc: "SMS/WhatsApp to customer segments" },
          ].map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="flex items-start gap-3 p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 hover:border-ocean-teal/20 transition-colors"
            >
              <span className="text-xl mt-0.5 shrink-0" aria-hidden="true">{action.icon}</span>
              <div>
                <p className="font-medium text-text-primary text-sm">{action.label}</p>
                <p className="text-xs text-text-secondary mt-0.5 leading-relaxed">{action.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
