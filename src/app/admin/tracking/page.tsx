export const dynamic = "force-dynamic";

import { createServerSupabaseClient } from "@/lib/supabase";
import TrackingForm, { type VillageOption } from "./TrackingForm";

const STATUS_LABEL: Record<string, string> = {
  caught: "Fish Caught",
  processing: "Processing",
  packed: "Packed in Cooler",
  at_airport: "At Airport",
  cargo_accepted: "Cargo Accepted",
  departed: "Flight Departed",
  in_flight: "In Flight",
  landed: "Landed",
  customs_cleared: "Customs Cleared",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
};

const STATUS_COLOR: Record<string, string> = {
  caught: "#4fc3f7",
  processing: "#4fc3f7",
  packed: "#4fc3f7",
  at_airport: "#ffab40",
  cargo_accepted: "#ffab40",
  departed: "#ffab40",
  in_flight: "#ffab40",
  landed: "#66bb6a",
  customs_cleared: "#66bb6a",
  out_for_delivery: "#66bb6a",
  delivered: "#66bb6a",
};

type WindowWithUpdates = {
  id: string;
  flight_date: string;
  flight_number: string | null;
  status: string;
  updates: {
    id: string;
    status: string;
    note: string | null;
    photo_url: string | null;
    created_at: string;
    updater_name: string | null;
    village_name: string | null;
  }[];
  villages: VillageOption[];
};

async function getActiveWindows(): Promise<WindowWithUpdates[]> {
  try {
    const supabase = createServerSupabaseClient();

    // Fetch windows with trackable statuses (closed → delivered)
    const { data: windows } = await supabase
      .from("flight_windows")
      .select("id, flight_date, flight_number, status")
      .in("status", ["closed", "packing", "shipped", "in_transit", "landed", "customs", "delivering", "delivered"])
      .order("flight_date", { ascending: false });

    if (!windows || windows.length === 0) return [];

    const windowIds = windows.map((w) => w.id);

    // Fetch all shipment updates for these windows
    const { data: updates } = await supabase
      .from("shipment_updates")
      .select("id, flight_window_id, status, note, photo_url, created_at, village_id, updated_by")
      .in("flight_window_id", windowIds)
      .order("created_at", { ascending: false });

    // Fetch user names for updaters
    const updaterIds = [...new Set((updates ?? []).map((u) => u.updated_by).filter(Boolean))];
    const userMap: Record<string, string> = {};
    if (updaterIds.length > 0) {
      const { data: users } = await supabase
        .from("users")
        .select("id, full_name, email")
        .in("id", updaterIds);
      for (const u of users ?? []) {
        userMap[u.id] = u.full_name ?? u.email ?? "Unknown";
      }
    }

    // Fetch village names
    const villageIds = [...new Set((updates ?? []).map((u) => u.village_id).filter(Boolean))];
    const villageMap: Record<string, string> = {};

    // Also fetch villages for each window (from inventory_availability)
    const { data: invRows } = await supabase
      .from("inventory_availability")
      .select("flight_window_id, village_id, villages:village_id(id, name)")
      .in("flight_window_id", windowIds);

    // Build window → villages mapping + populate villageMap
    const windowVillages: Record<string, VillageOption[]> = {};
    for (const row of (invRows ?? []) as unknown as {
      flight_window_id: string;
      village_id: string;
      villages: { id: string; name: string } | null;
    }[]) {
      if (!row.villages) continue;
      villageMap[row.villages.id] = row.villages.name;
      if (!windowVillages[row.flight_window_id]) windowVillages[row.flight_window_id] = [];
      const already = windowVillages[row.flight_window_id].some((v) => v.id === row.villages!.id);
      if (!already) {
        windowVillages[row.flight_window_id].push({ id: row.villages.id, name: row.villages.name });
      }
    }

    // Also ensure village names from updates are loaded
    for (const id of villageIds) {
      if (!villageMap[id]) {
        const { data: v } = await supabase
          .from("villages")
          .select("name")
          .eq("id", id)
          .maybeSingle();
        if (v) villageMap[id] = v.name;
      }
    }

    // Group updates by window
    const updatesByWindow: Record<string, WindowWithUpdates["updates"]> = {};
    for (const u of (updates ?? [])) {
      if (!updatesByWindow[u.flight_window_id]) updatesByWindow[u.flight_window_id] = [];
      updatesByWindow[u.flight_window_id].push({
        id: u.id,
        status: u.status,
        note: u.note,
        photo_url: u.photo_url,
        created_at: u.created_at,
        updater_name: u.updated_by ? (userMap[u.updated_by] ?? null) : null,
        village_name: u.village_id ? (villageMap[u.village_id] ?? null) : null,
      });
    }

    return windows.map((w) => ({
      id: w.id,
      flight_date: w.flight_date,
      flight_number: w.flight_number,
      status: w.status,
      updates: updatesByWindow[w.id] ?? [],
      villages: windowVillages[w.id] ?? [],
    }));
  } catch {
    return [];
  }
}

export default async function AdminTrackingPage() {
  const windows = await getActiveWindows();

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <p className="text-xs font-mono text-text-secondary uppercase tracking-widest mb-1">Admin</p>
        <h1 className="text-2xl font-bold text-text-primary">Shipment Tracking</h1>
        <p className="text-text-secondary text-sm mt-1">
          Post status updates as each shipment moves from reef to customer.
        </p>
      </div>

      {windows.length === 0 ? (
        <div className="py-20 text-center border border-dashed border-white/20 rounded-xl">
          <span className="text-4xl block mb-3" aria-hidden="true">🐟</span>
          <p className="text-text-secondary text-sm">No active shipments</p>
          <p className="text-text-secondary text-xs mt-1">
            Tracking updates can be posted once a flight window is closed or further in the lifecycle.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {windows.map((w) => {
            const dateLabel = new Date(w.flight_date + "T00:00:00").toLocaleDateString("en-AU", {
              weekday: "short", day: "numeric", month: "short", year: "numeric",
            });

            return (
              <div key={w.id} className="bg-white/[0.03] border border-white/10 rounded-xl overflow-hidden">
                {/* Window header */}
                <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between gap-4 bg-white/[0.02]">
                  <div>
                    <p className="font-bold text-text-primary">{dateLabel}</p>
                    {w.flight_number && (
                      <p className="text-xs font-mono text-text-secondary">{w.flight_number}</p>
                    )}
                    <p className="text-xs font-mono text-text-secondary mt-0.5 uppercase tracking-wider">
                      {w.status.replace(/_/g, " ")}
                    </p>
                  </div>
                  {w.villages.length > 0 && (
                    <TrackingForm flightWindowId={w.id} villages={w.villages} />
                  )}
                  {w.villages.length === 0 && (
                    <span className="text-xs text-text-secondary font-mono">No villages assigned</span>
                  )}
                </div>

                {/* Timeline */}
                <div className="px-5 py-4">
                  {w.updates.length === 0 ? (
                    <p className="text-xs text-text-secondary text-center py-4">
                      No updates posted yet — be the first to post a status update.
                    </p>
                  ) : (
                    <div className="relative">
                      {/* Vertical line */}
                      <div className="absolute left-3 top-2 bottom-2 w-px bg-white/10" aria-hidden="true" />

                      <div className="flex flex-col gap-5">
                        {w.updates.map((u) => {
                          const color = STATUS_COLOR[u.status] ?? "#90a4ae";
                          const label = STATUS_LABEL[u.status] ?? u.status;
                          const postedAt = new Date(u.created_at).toLocaleString("en-AU", {
                            day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                          });

                          return (
                            <div key={u.id} className="flex gap-4 relative">
                              {/* Dot */}
                              <div
                                className="w-6 h-6 rounded-full border-2 shrink-0 flex items-center justify-center z-10"
                                style={{ borderColor: color, background: "#0a0f1a" }}
                                aria-hidden="true"
                              >
                                <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                              </div>

                              {/* Content */}
                              <div className="flex-1 min-w-0 pb-1">
                                <div className="flex items-start justify-between gap-2 flex-wrap">
                                  <p className="text-sm font-semibold" style={{ color }}>{label}</p>
                                  <span className="text-[10px] font-mono text-text-secondary whitespace-nowrap">
                                    {postedAt}
                                  </span>
                                </div>
                                {u.village_name && (
                                  <p className="text-xs text-text-secondary font-mono">{u.village_name}</p>
                                )}
                                {u.note && (
                                  <p className="text-xs text-text-secondary mt-0.5">{u.note}</p>
                                )}
                                {u.updater_name && (
                                  <p className="text-[10px] text-text-secondary/60 mt-0.5">
                                    Posted by {u.updater_name}
                                  </p>
                                )}
                                {u.photo_url && (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={u.photo_url}
                                    alt={`${label} photo`}
                                    loading="lazy"
                                    className="mt-2 w-32 h-24 object-cover rounded-lg border border-white/10"
                                  />
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
