export const dynamic = "force-dynamic";

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getVillageId } from "@/lib/roles";
import { createServerSupabaseClient } from "@/lib/supabase";
import SupplierTrackingForm from "./SupplierTrackingForm";

export const metadata = { title: "Tracking — Supplier Portal" };

const STATUS_LABEL: Record<string, string> = {
  caught: "Fish Caught 🎣",
  processing: "Processing 🔪",
  packed: "Packed 📦",
  at_airport: "At Airport 🏢",
  cargo_accepted: "Cargo Accepted ✅",
  departed: "Departed ✈️",
  in_flight: "In Flight 🛫",
  landed: "Landed 🛬",
  customs_cleared: "Customs Cleared 🇦🇺",
  out_for_delivery: "Out for Delivery 🚚",
  delivered: "Delivered 🎉",
};

export default async function SupplierTrackingPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in?redirect_url=/supplier/tracking");

  const villageId = await getVillageId();
  const supabase = createServerSupabaseClient();

  // Fetch the active/upcoming flight window
  const { data: windowRows } = await supabase
    .from("flight_windows")
    .select("id, flight_date, flight_number, status")
    .in("status", ["closed", "packing", "shipped", "in_transit", "landed", "customs", "delivering"])
    .order("flight_date", { ascending: true })
    .limit(1);

  const activeWindow = windowRows?.[0] ?? null;

  // Fetch existing tracking updates for this village + window
  type UpdateRow = {
    id: string;
    status: string;
    note: string | null;
    photo_url: string | null;
    created_at: string;
  };

  let updates: UpdateRow[] = [];

  if (activeWindow && villageId) {
    const { data } = await supabase
      .from("shipment_updates")
      .select("id, status, note, photo_url, created_at")
      .eq("flight_window_id", activeWindow.id)
      .eq("village_id", villageId)
      .order("created_at", { ascending: false });

    updates = (data ?? []) as UpdateRow[];
  }

  const flightLabel = activeWindow?.flight_date
    ? new Date(activeWindow.flight_date + "T00:00:00").toLocaleDateString("en-AU", {
        weekday: "short", day: "numeric", month: "short",
      })
    : null;

  return (
    <div className="px-4 py-5 space-y-6">
      {/* Header */}
      <div>
        <p className="text-[10px] font-mono text-cyan-600 uppercase tracking-widest mb-0.5">
          Supplier Portal
        </p>
        <h1 className="text-2xl font-bold text-gray-900">Shipment Updates</h1>
        {flightLabel && (
          <p className="text-sm text-gray-500 mt-0.5">Flight: {flightLabel}</p>
        )}
      </div>

      {/* No window */}
      {!activeWindow && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-4">
          <p className="text-sm font-semibold text-amber-700">No active shipment</p>
          <p className="text-xs text-amber-600 mt-1">
            Tracking updates can be posted once the order window has closed and packing begins.
          </p>
        </div>
      )}

      {/* No village */}
      {!villageId && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-4">
          <p className="text-sm font-semibold text-amber-700">Village not assigned</p>
          <p className="text-xs text-amber-600 mt-1">
            Contact admin to assign a village to your account.
          </p>
        </div>
      )}

      {/* Upload form */}
      {activeWindow && villageId && (
        <SupplierTrackingForm
          flightWindowId={activeWindow.id}
          villageId={villageId}
        />
      )}

      {/* Timeline of updates posted */}
      {updates.length > 0 && (
        <div>
          <h2 className="text-base font-bold text-gray-900 mb-3">Your Updates</h2>
          <div className="relative">
            <div className="absolute left-3 top-2 bottom-2 w-px bg-gray-200" aria-hidden="true" />
            <div className="flex flex-col gap-5">
              {updates.map((u) => {
                const label = STATUS_LABEL[u.status] ?? u.status;
                const postedAt = new Date(u.created_at).toLocaleString("en-AU", {
                  day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                });

                return (
                  <div key={u.id} className="flex gap-4 relative">
                    <div className="w-6 h-6 rounded-full border-2 border-cyan-500 bg-white shrink-0 flex items-center justify-center z-10">
                      <div className="w-2 h-2 rounded-full bg-cyan-500" />
                    </div>
                    <div className="flex-1 min-w-0 pb-1">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-gray-900">{label}</p>
                        <span className="text-[10px] text-gray-400 whitespace-nowrap">{postedAt}</span>
                      </div>
                      {u.note && (
                        <p className="text-xs text-gray-500 mt-0.5">{u.note}</p>
                      )}
                      {u.photo_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={u.photo_url}
                          alt={`${label} photo`}
                          loading="lazy"
                          className="mt-2 w-full max-h-48 object-cover rounded-xl border border-gray-200"
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {activeWindow && villageId && updates.length === 0 && (
        <p className="text-center text-sm text-gray-400 py-4">
          No updates posted yet for this window.
        </p>
      )}
    </div>
  );
}
