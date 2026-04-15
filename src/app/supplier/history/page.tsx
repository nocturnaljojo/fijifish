export const dynamic = "force-dynamic";

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getVillageId } from "@/lib/roles";
import { getSupabaseUser } from "@/lib/supabase-auth";

export const metadata = { title: "History — Supplier Portal" };

type InvRow = {
  total_capacity_kg: number;
  reserved_kg: number;
  confirmed_by_supplier: boolean;
  fish_species: { name_fijian: string | null; name_english: string } | null;
  flight_windows: {
    id: string;
    flight_date: string;
    flight_number: string | null;
    status: string;
  } | null;
};

type WindowSummary = {
  windowId: string;
  flightDate: string;
  flightNumber: string | null;
  status: string;
  species: {
    name: string;
    totalKg: number;
    soldKg: number;
    confirmed: boolean;
  }[];
};

const WINDOW_STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  delivered: { label: "Delivered ✓", cls: "bg-green-100 text-green-700" },
  delivering: { label: "Out for delivery", cls: "bg-blue-100 text-blue-700" },
  customs: { label: "Customs", cls: "bg-purple-100 text-purple-700" },
  landed: { label: "Landed", cls: "bg-indigo-100 text-indigo-700" },
  shipped: { label: "In flight", cls: "bg-sky-100 text-sky-700" },
  in_transit: { label: "In transit", cls: "bg-sky-100 text-sky-700" },
  packing: { label: "Packing", cls: "bg-amber-100 text-amber-700" },
  cancelled: { label: "Cancelled", cls: "bg-red-100 text-red-600" },
  closed: { label: "Closed", cls: "bg-gray-100 text-gray-500" },
};

export default async function SupplierHistoryPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in?redirect_url=/supplier/history");

  const villageId = await getVillageId();

  if (!villageId) {
    return (
      <div className="px-4 py-5 space-y-5">
        <div>
          <p className="text-[10px] font-mono text-cyan-600 uppercase tracking-widest mb-0.5">
            Supplier Portal
          </p>
          <h1 className="text-2xl font-bold text-gray-900">History</h1>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-4">
          <p className="text-sm font-semibold text-amber-700">Village not assigned</p>
          <p className="text-xs text-amber-600 mt-1">
            Contact admin to assign a village to your account.
          </p>
        </div>
      </div>
    );
  }

  const supabase = await getSupabaseUser();

  // Fetch all inventory rows for this village, newest window first
  const { data: invRows } = await supabase
    .from("inventory_availability")
    .select(
      "total_capacity_kg, reserved_kg, confirmed_by_supplier, fish_species:fish_species_id(name_fijian, name_english), flight_windows:flight_window_id(id, flight_date, flight_number, status)",
    )
    .eq("village_id", villageId);

  // Group by flight window
  const windowMap = new Map<string, WindowSummary>();

  for (const row of (invRows ?? []) as unknown as InvRow[]) {
    if (!row.flight_windows) continue;
    const wid = row.flight_windows.id;

    if (!windowMap.has(wid)) {
      windowMap.set(wid, {
        windowId: wid,
        flightDate: row.flight_windows.flight_date,
        flightNumber: row.flight_windows.flight_number,
        status: row.flight_windows.status,
        species: [],
      });
    }

    const group = windowMap.get(wid)!;
    group.species.push({
      name:
        row.fish_species?.name_fijian ??
        row.fish_species?.name_english ??
        "Unknown",
      totalKg: Number(row.total_capacity_kg),
      soldKg: Number(row.reserved_kg),
      confirmed: row.confirmed_by_supplier,
    });
  }

  // Sort newest first
  const windows = Array.from(windowMap.values()).sort(
    (a, b) => new Date(b.flightDate).getTime() - new Date(a.flightDate).getTime(),
  );

  return (
    <div className="px-4 py-5 space-y-5">
      {/* Header */}
      <div>
        <p className="text-[10px] font-mono text-cyan-600 uppercase tracking-widest mb-0.5">
          Supplier Portal
        </p>
        <h1 className="text-2xl font-bold text-gray-900">History</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Past flight windows your village contributed to.
        </p>
      </div>

      {windows.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 px-4 py-8 text-center">
          <span className="text-3xl block mb-2" aria-hidden="true">📋</span>
          <p className="text-sm font-semibold text-gray-700">No history yet</p>
          <p className="text-xs text-gray-400 mt-1">
            Your completed flights will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {windows.map((win) => {
            const dateLabel = new Date(win.flightDate + "T00:00:00").toLocaleDateString(
              "en-AU",
              { weekday: "short", day: "numeric", month: "short", year: "numeric" },
            );
            const badge =
              WINDOW_STATUS_BADGE[win.status] ??
              WINDOW_STATUS_BADGE.closed;
            const totalKg = win.species.reduce((s, r) => s + r.totalKg, 0);
            const soldKg = win.species.reduce((s, r) => s + r.soldKg, 0);

            return (
              <div
                key={win.windowId}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden"
              >
                {/* Window header */}
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold text-gray-900">{dateLabel}</p>
                    {win.flightNumber && (
                      <p className="text-xs font-mono text-gray-400">{win.flightNumber}</p>
                    )}
                  </div>
                  <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${badge.cls}`}>
                    {badge.label}
                  </span>
                </div>

                {/* Species list */}
                <div className="px-4 py-3 space-y-2">
                  {win.species.map((sp, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="text-gray-700">
                        {sp.name}
                        {sp.confirmed && (
                          <span className="ml-1.5 text-[10px] text-green-600 font-semibold">✓</span>
                        )}
                      </span>
                      <span className="text-gray-500 font-mono text-xs">
                        {sp.soldKg}kg / {sp.totalKg}kg
                      </span>
                    </div>
                  ))}
                </div>

                {/* Totals footer */}
                <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                  <span>{win.species.length} species</span>
                  <span className="font-semibold text-gray-700">
                    {soldKg}kg sold / {totalKg}kg supplied
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
