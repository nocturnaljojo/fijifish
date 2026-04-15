"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export interface DriverOption {
  id: string;
  full_name: string;
  vehicle_description: string | null;
}

export interface StopCandidate {
  orderId: string;
  customerId: string;
  address: string | null;
  customerName: string;
  phone: string | null;
  zoneName: string;
  zoneState: string;
  totalAud: number;
  items: { kg: number; species: string }[];
  deliveryNotes: string | null;
  sequenceNumber: number;
  isCommunal: boolean;
  communalGroupId: string | null;
}

const inputCls =
  "w-full px-3 py-2 rounded-lg bg-white/5 border border-white/15 text-text-primary text-sm focus:outline-none focus:border-ocean-teal/60 transition-colors";

export default function CreateRunForm({
  windowId,
  drivers,
  initialStops,
}: {
  windowId: string;
  drivers: DriverOption[];
  initialStops: StopCandidate[];
}) {
  const router = useRouter();
  const [driverId, setDriverId] = useState(drivers[0]?.id ?? "");
  const [stops, setStops] = useState<StopCandidate[]>(initialStops);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateSequence(orderId: string, value: string) {
    const num = parseInt(value, 10);
    if (isNaN(num) || num < 1) return;
    setStops((prev) =>
      prev
        .map((s) => (s.orderId === orderId ? { ...s, sequenceNumber: num } : s))
        .sort((a, b) => a.sequenceNumber - b.sequenceNumber),
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!driverId) { setError("Please select a driver"); return; }
    if (stops.length === 0) { setError("No stops to assign"); return; }

    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/admin/deliveries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        window_id: windowId,
        driver_id: driverId,
        stops: stops.map((s) => ({
          order_id: s.orderId,
          customer_id: s.customerId,
          address: s.address,
          sequence_number: s.sequenceNumber,
          is_communal: s.isCommunal,
          communal_group_id: s.communalGroupId,
        })),
      }),
    });

    const json = await res.json() as { ok?: boolean; error?: string };
    setSubmitting(false);

    if (!res.ok) {
      setError(json.error ?? "Failed to create delivery run");
      return;
    }

    router.push("/admin/deliveries");
    router.refresh();
  }

  const totalKg = stops.reduce(
    (sum, s) => sum + s.items.reduce((a, i) => a + i.kg, 0),
    0,
  );

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-8">
      {/* Driver selection */}
      <div className="bg-white/[0.03] border border-white/10 rounded-xl p-5 flex flex-col gap-4">
        <h2 className="text-xs font-mono text-text-secondary uppercase tracking-widest">Driver</h2>

        {drivers.length === 0 ? (
          <div className="py-6 text-center">
            <p className="text-reef-coral text-sm">No active drivers found.</p>
            <p className="text-text-secondary text-xs mt-1">
              Add a driver record in Supabase first.
            </p>
          </div>
        ) : (
          <select
            value={driverId}
            onChange={(e) => setDriverId(e.target.value)}
            className={inputCls}
          >
            {drivers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.full_name}
                {d.vehicle_description ? ` · ${d.vehicle_description}` : ""}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Stop list */}
      <div className="bg-white/[0.03] border border-white/10 rounded-xl p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xs font-mono text-text-secondary uppercase tracking-widest">
            Stops ({stops.length})
          </h2>
          <p className="text-xs text-text-secondary font-mono">
            {totalKg.toFixed(1)} kg total
          </p>
        </div>

        {stops.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-text-secondary text-sm">
              No paid orders without a delivery run for this window.
            </p>
            <p className="text-text-secondary text-xs mt-1">
              Orders must have status <span className="font-mono">paid</span> or{" "}
              <span className="font-mono">confirmed</span> and not already be assigned to a run.
            </p>
          </div>
        ) : (
          <>
            {/* Column headers */}
            <div className="hidden sm:grid grid-cols-[40px_1fr_120px_80px_80px] gap-3 text-[10px] font-mono text-text-secondary/60 uppercase tracking-wider px-1">
              <span>#</span>
              <span>Customer / Address</span>
              <span>Zone</span>
              <span>Items</span>
              <span>Total</span>
            </div>

            <div className="flex flex-col gap-2">
              {stops.map((stop) => (
                <div
                  key={stop.orderId}
                  className={`rounded-xl border p-3 flex flex-col sm:grid sm:grid-cols-[40px_1fr_120px_80px_80px] sm:items-start gap-3 ${
                    stop.isCommunal
                      ? "border-sunset-gold/25 bg-sunset-gold/5"
                      : "border-white/10 bg-white/[0.02]"
                  }`}
                >
                  {/* Sequence number input */}
                  <input
                    type="number"
                    min={1}
                    max={999}
                    value={stop.sequenceNumber}
                    onChange={(e) => updateSequence(stop.orderId, e.target.value)}
                    className="w-10 px-1.5 py-1 rounded-lg bg-white/10 border border-white/20 text-text-primary text-xs font-mono text-center focus:outline-none focus:border-ocean-teal/60"
                    aria-label="Sequence number"
                  />

                  {/* Customer + address */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-text-primary text-sm truncate">
                        {stop.customerName}
                      </p>
                      {stop.isCommunal && (
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-sunset-gold/15 border border-sunset-gold/30 text-sunset-gold uppercase tracking-wider">
                          Communal
                        </span>
                      )}
                    </div>
                    {stop.phone && (
                      <p className="text-xs text-ocean-teal mt-0.5">{stop.phone}</p>
                    )}
                    {stop.address && (
                      <p className="text-xs text-text-secondary mt-0.5 leading-relaxed">
                        {stop.address}
                      </p>
                    )}
                    {stop.deliveryNotes && (
                      <p className="text-xs text-sunset-gold mt-1 italic">
                        Note: {stop.deliveryNotes}
                      </p>
                    )}
                  </div>

                  {/* Zone */}
                  <div>
                    <p className="text-xs text-text-primary">{stop.zoneName}</p>
                    <p className="text-xs text-text-secondary">{stop.zoneState}</p>
                  </div>

                  {/* Items */}
                  <div className="flex flex-wrap gap-1">
                    {stop.items.map((item, i) => (
                      <span
                        key={i}
                        className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-text-secondary"
                      >
                        {item.kg}kg
                      </span>
                    ))}
                  </div>

                  {/* Total */}
                  <p className="text-xs font-mono text-text-secondary">
                    A${(stop.totalAud / 100).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>

            <p className="text-[10px] text-text-secondary/50 font-mono">
              Tip: Change the # value to reorder stops. Stops re-sort automatically.
              Highlighted rows share the same delivery address (communal).
            </p>
          </>
        )}
      </div>

      {/* Summary + submit */}
      <div className="bg-white/[0.03] border border-white/10 rounded-xl p-5 flex flex-col gap-4">
        <h2 className="text-xs font-mono text-text-secondary uppercase tracking-widest">Summary</h2>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-text-secondary">Stops</p>
            <p className="text-2xl font-bold text-text-primary font-mono">{stops.length}</p>
          </div>
          <div>
            <p className="text-xs text-text-secondary">Communal</p>
            <p className="text-2xl font-bold text-sunset-gold font-mono">
              {stops.filter((s) => s.isCommunal).length}
            </p>
          </div>
          <div>
            <p className="text-xs text-text-secondary">Total kg</p>
            <p className="text-2xl font-bold text-ocean-teal font-mono">{totalKg.toFixed(1)}</p>
          </div>
        </div>

        {error && (
          <p className="text-sm text-reef-coral font-mono">{error}</p>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={submitting || stops.length === 0 || !driverId}
            className="px-6 py-3 rounded-xl bg-ocean-teal text-bg-primary text-sm font-bold hover:opacity-90 disabled:opacity-40 transition-opacity"
          >
            {submitting ? "Creating…" : "Create Delivery Run"}
          </button>
          <a
            href="/admin/deliveries"
            className="px-6 py-3 rounded-xl border border-white/20 text-text-secondary text-sm hover:text-text-primary transition-colors flex items-center"
          >
            Cancel
          </a>
        </div>
      </div>
    </form>
  );
}
