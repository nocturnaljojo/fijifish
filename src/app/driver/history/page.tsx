export const dynamic = "force-dynamic";

import { getSupabaseUser } from "@/lib/supabase-auth";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

async function getHistory() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const supabase = await getSupabaseUser();

  const { data: user } = await supabase
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  if (!user) return [];

  const { data: driver } = await supabase
    .from("drivers")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!driver) return [];

  const { data: runs } = await supabase
    .from("delivery_runs")
    .select(`
      id, status, started_at, completed_at, stop_count,
      flight_windows(flight_number, flight_date)
    `)
    .eq("driver_id", driver.id)
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(30);

  if (!runs?.length) return [];

  // Fetch stops for all runs
  const runIds = runs.map((r) => r.id);
  const { data: allStops } = await supabase
    .from("delivery_stops")
    .select(`
      id, delivery_run_id, sequence_number, address, status, delivered_at,
      customers(users:user_id(full_name)),
      delivery_proofs(photo_url, received_by_name, is_proxy_delivery)
    `)
    .in("delivery_run_id", runIds)
    .order("sequence_number", { ascending: true });

  return runs.map((run) => ({
    ...run,
    stops: (allStops ?? []).filter((s) => s.delivery_run_id === run.id),
  }));
}

function formatDuration(startedAt: string | null, completedAt: string | null): string {
  if (!startedAt || !completedAt) return "—";
  const mins = Math.round((new Date(completedAt).getTime() - new Date(startedAt).getTime()) / 60000);
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

export default async function DriverHistoryPage() {
  const runs = await getHistory();

  return (
    <div className="p-4 max-w-xl mx-auto">
      <div className="mb-6 pt-2">
        <p className="text-xs font-mono text-text-secondary uppercase tracking-widest mb-1">Driver</p>
        <h1 className="text-2xl font-bold text-text-primary">History</h1>
      </div>

      {runs.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-white/15 rounded-xl">
          <span className="text-4xl block mb-3" aria-hidden="true">📋</span>
          <p className="text-text-primary font-semibold mb-1">No completed runs yet</p>
          <p className="text-text-secondary text-sm">
            Completed delivery runs will appear here.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {runs.map((run) => {
            const window = run.flight_windows as unknown as { flight_number: string | null; flight_date: string } | null;
            const deliveredCount = run.stops.filter((s) => s.status === "delivered").length;
            const skippedCount = run.stops.filter((s) => s.status === "skipped").length;

            return (
              <details key={run.id} className="bg-white/[0.03] border border-white/10 rounded-xl overflow-hidden group">
                <summary className="p-4 flex items-start justify-between gap-3 cursor-pointer list-none">
                  <div>
                    <p className="font-bold text-text-primary">
                      {window?.flight_number ?? "—"} · {window?.flight_date ?? "—"}
                    </p>
                    <p className="text-xs text-text-secondary mt-1">
                      {deliveredCount} delivered · {skippedCount} skipped ·{" "}
                      {formatDuration(run.started_at, run.completed_at)}
                    </p>
                    {run.completed_at && (
                      <p className="text-xs text-text-secondary/50 mt-0.5 font-mono">
                        {new Date(run.completed_at).toLocaleDateString("en-AU", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    )}
                  </div>
                  <span className="text-xs font-mono text-lagoon-green bg-lagoon-green/10 border border-lagoon-green/30 px-2 py-0.5 rounded-full shrink-0">
                    Completed
                  </span>
                </summary>

                {/* Stop detail */}
                <div className="border-t border-white/10 divide-y divide-white/5">
                  {run.stops.map((stop) => {
                    type StopProofs = { photo_url: string; received_by_name: string | null; is_proxy_delivery: boolean }[];
                    const proofs = (stop.delivery_proofs ?? []) as StopProofs;
                    const firstProof = proofs[0];
                    type CustomerShape = { users: { full_name: string | null } | null };
                    const rawCust = stop.customers as unknown as CustomerShape | CustomerShape[] | null;
                    const custObj = Array.isArray(rawCust) ? (rawCust[0] ?? null) : rawCust;
                    const customer = custObj?.users;

                    return (
                      <div key={stop.id} className="p-4 flex items-start gap-3">
                        <span className="w-6 h-6 rounded-full bg-white/10 text-xs font-mono text-text-secondary flex items-center justify-center shrink-0 mt-0.5">
                          {stop.sequence_number}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-medium text-text-primary truncate">
                              {customer?.full_name ?? "—"}
                            </p>
                            <span className={`text-[10px] font-mono shrink-0 ${
                              stop.status === "delivered" ? "text-lagoon-green" : "text-text-secondary/50"
                            }`}>
                              {stop.status}
                            </span>
                          </div>
                          {stop.address && (
                            <p className="text-xs text-text-secondary truncate mt-0.5">{stop.address}</p>
                          )}
                          {firstProof?.received_by_name && (
                            <p className="text-xs text-text-secondary/60 mt-0.5">
                              Received by: {firstProof.received_by_name}
                              {firstProof.is_proxy_delivery && " (proxy)"}
                            </p>
                          )}
                          {firstProof?.photo_url && (
                            <a
                              href={firstProof.photo_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-ocean-teal mt-1 inline-block"
                            >
                              View proof photo →
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </details>
            );
          })}
        </div>
      )}
    </div>
  );
}
