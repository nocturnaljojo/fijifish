export const dynamic = "force-dynamic";

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getVillageId } from "@/lib/roles";
import { getSupabaseUser } from "@/lib/supabase-auth";
import { getFlightWindowStatus } from "@/lib/flight-window-state";
import InventoryManager, {
  type SupplierInventoryRow,
} from "@/components/supplier/InventoryManager";
import type { FlightWindow } from "@/types/database";

export const metadata = { title: "Dashboard — Supplier Portal" };

type InvQueryRow = {
  id: string;
  fish_species_id: string;
  total_capacity_kg: number;
  reserved_kg: number;
  price_aud_cents: number;
  confirmed_by_supplier: boolean;
  confirmed_at: string | null;
  fish_species: { name_fijian: string | null; name_english: string } | null;
};

export default async function SupplierDashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in?redirect_url=/supplier");

  const villageId = await getVillageId();
  const supabase = await getSupabaseUser();

  // Fetch the next active or upcoming flight window
  const { data: windowRows } = await supabase
    .from("flight_windows")
    .select(
      "id, flight_date, flight_number, order_open_at, order_close_at, status, status_updated_at, labasa_departure_time, nadi_departure_time, canberra_arrival_time, notes, created_at",
    )
    .in("status", ["open", "closing_soon", "upcoming", "packing"])
    .order("flight_date", { ascending: true })
    .limit(1);

  const activeWindow = (windowRows?.[0] as FlightWindow) ?? null;

  // Compute state-machine status (time-driven states computed here)
  const windowStatus = activeWindow
    ? getFlightWindowStatus(activeWindow, new Date())
    : null;

  // Fetch inventory for this village + window
  let inventoryItems: SupplierInventoryRow[] = [];

  if (activeWindow && villageId) {
    const { data: invRows } = await supabase
      .from("inventory_availability")
      .select(
        "id, fish_species_id, total_capacity_kg, reserved_kg, price_aud_cents, confirmed_by_supplier, confirmed_at, fish_species:fish_species_id(name_fijian, name_english)",
      )
      .eq("flight_window_id", activeWindow.id)
      .eq("village_id", villageId)
      .order("created_at", { ascending: true });

    inventoryItems = ((invRows ?? []) as unknown as InvQueryRow[]).map((r) => ({
      id: r.id,
      fish_species_id: r.fish_species_id,
      fish_name_fijian: r.fish_species?.name_fijian ?? null,
      fish_name_english: r.fish_species?.name_english ?? "Unknown",
      total_capacity_kg: Number(r.total_capacity_kg),
      reserved_kg: Number(r.reserved_kg),
      price_aud_cents: r.price_aud_cents,
      confirmed_by_supplier: r.confirmed_by_supplier,
      confirmed_at: r.confirmed_at,
    }));
  }

  const flightLabel = activeWindow?.flight_date
    ? new Date(activeWindow.flight_date + "T00:00:00").toLocaleDateString("en-AU", {
        weekday: "short",
        day: "numeric",
        month: "short",
      })
    : null;

  const statusBadge: Record<string, { label: string; cls: string }> = {
    open: { label: "Orders open", cls: "bg-green-100 text-green-700" },
    closing_soon: { label: "Closing soon!", cls: "bg-amber-100 text-amber-700" },
    upcoming: { label: "Upcoming", cls: "bg-blue-100 text-blue-700" },
    packing: { label: "Packing", cls: "bg-purple-100 text-purple-700" },
    closed: { label: "Closed", cls: "bg-gray-100 text-gray-500" },
  };

  const badge = windowStatus ? (statusBadge[windowStatus] ?? { label: windowStatus, cls: "bg-gray-100 text-gray-500" }) : null;

  return (
    <div className="px-4 py-5 space-y-5">
      {/* Page header */}
      <div>
        <p className="text-[10px] font-mono text-cyan-600 uppercase tracking-widest mb-0.5">
          Supplier Portal
        </p>
        <h1 className="text-2xl font-bold text-gray-900">Catch Dashboard</h1>
      </div>

      {/* ── Active flight window card ─────────────────────────────── */}
      {activeWindow ? (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 bg-cyan-50 border-b border-cyan-100 flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-mono text-cyan-600 uppercase tracking-wide mb-0.5">
                Next Flight
              </p>
              <p className="text-xl font-bold text-gray-900">{flightLabel}</p>
              {activeWindow.flight_number && (
                <p className="text-xs font-mono text-gray-500 mt-0.5">
                  {activeWindow.flight_number}
                </p>
              )}
            </div>
            {badge && (
              <span
                className={`shrink-0 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold mt-0.5 ${badge.cls}`}
              >
                {badge.label}
              </span>
            )}
          </div>

          <div className="px-4 py-3 text-xs text-gray-500 space-y-0.5">
            <p>
              Orders close:{" "}
              <span className="font-semibold text-gray-700">
                {new Date(activeWindow.order_close_at).toLocaleDateString("en-AU", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                  timeZone: "Pacific/Fiji",
                })}{" "}
                FJT
              </span>
            </p>
            {activeWindow.labasa_departure_time && (
              <p>
                Departs Labasa:{" "}
                <span className="font-semibold text-gray-700">
                  {new Date(activeWindow.labasa_departure_time).toLocaleTimeString("en-AU", {
                    hour: "2-digit",
                    minute: "2-digit",
                    timeZone: "Pacific/Fiji",
                  })}{" "}
                  FJT
                </span>
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 px-4 py-6 text-center">
          <span className="text-3xl block mb-2" aria-hidden="true">🌊</span>
          <p className="text-sm font-semibold text-gray-700">No active flight window</p>
          <p className="text-xs text-gray-400 mt-1">
            Check back when the next flight is scheduled by your admin.
          </p>
        </div>
      )}

      {/* ── Village not configured warning ───────────────────────── */}
      {!villageId && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-4">
          <p className="text-sm font-bold text-amber-700">Village not assigned</p>
          <p className="text-xs text-amber-600 mt-1">
            Ask your admin to set{" "}
            <code className="bg-amber-100 px-1 rounded">village_id</code> in your
            Clerk public metadata.
          </p>
        </div>
      )}

      {/* ── Inventory management ─────────────────────────────────── */}
      {activeWindow && villageId && (
        <>
          <div>
            <h2 className="text-base font-bold text-gray-900">Your Catch</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Enter how many kg of each species you can supply, then confirm.
            </p>
          </div>

          <InventoryManager
            items={inventoryItems}
            windowId={activeWindow.id}
            flightDate={flightLabel ?? "this flight"}
            orderCloseAt={activeWindow.order_close_at}
          />
        </>
      )}
    </div>
  );
}
