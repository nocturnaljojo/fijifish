"use client";

import { useState } from "react";
import { CheckCircle } from "lucide-react";

export interface SupplierInventoryRow {
  id: string;
  fish_species_id: string;
  fish_name_fijian: string | null;
  fish_name_english: string;
  total_capacity_kg: number;
  reserved_kg: number;
  price_aud_cents: number;
  confirmed_by_supplier: boolean;
  confirmed_at: string | null;
}

interface Props {
  items: SupplierInventoryRow[];
  windowId: string;
  flightDate: string;
  orderCloseAt: string;
}

function formatPrice(cents: number) {
  return `A$${(cents / 100).toFixed(2)}`;
}

export default function InventoryManager({ items, windowId, flightDate, orderCloseAt }: Props) {
  const [kgValues, setKgValues] = useState<Record<string, string>>(
    () => Object.fromEntries(items.map((r) => [r.id, String(r.total_capacity_kg)])),
  );
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(() => items.length > 0 && items.every((r) => r.confirmed_by_supplier));
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const closeLabel = new Date(orderCloseAt).toLocaleDateString("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "Pacific/Fiji",
  });

  async function sendUpdate(confirmFlag: boolean) {
    setLoading(true);
    setError(null);
    setSaved(false);
    try {
      const rows = items.map((r) => ({
        id: r.id,
        total_capacity_kg: Math.max(0, parseFloat(kgValues[r.id] ?? "0") || 0),
        confirm: confirmFlag,
      }));
      const res = await fetch("/api/supplier/inventory", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows, window_id: windowId }),
      });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Update failed");
      if (confirmFlag) setConfirmed(true);
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 px-4 py-6 text-center">
        <p className="text-gray-500 text-sm">No species assigned to this window.</p>
        <p className="text-gray-400 text-xs mt-1">Contact admin to add your species to this flight.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Species rows */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden divide-y divide-gray-100">
        {items.map((row) => {
          const name = row.fish_name_fijian ?? row.fish_name_english;
          const subName = row.fish_name_fijian ? row.fish_name_english : null;
          const kg = kgValues[row.id] ?? String(row.total_capacity_kg);

          return (
            <div key={row.id} className="flex items-center gap-3 px-4 py-3.5">
              {/* Name */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900">{name}</p>
                {subName && <p className="text-xs text-gray-400">{subName}</p>}
                <p className="text-xs text-gray-400 mt-0.5">{formatPrice(row.price_aud_cents)}/kg · {row.reserved_kg}kg ordered</p>
              </div>

              {/* Kg input */}
              <div className="shrink-0 flex flex-col items-end gap-0.5">
                <span className="text-[10px] text-gray-400 uppercase tracking-wide">You supply</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={kg}
                    onChange={(e) =>
                      setKgValues((prev) => ({ ...prev, [row.id]: e.target.value }))
                    }
                    className="w-20 h-11 px-2 text-right text-sm font-semibold border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-gray-900 bg-gray-50"
                    aria-label={`${name} kg`}
                  />
                  <span className="text-xs text-gray-400">kg</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Confirmation status */}
      {confirmed && (
        <div className="flex items-center gap-2 px-4 py-3 bg-green-50 rounded-xl border border-green-200">
          <CheckCircle size={18} className="text-green-600 shrink-0" />
          <p className="text-sm font-semibold text-green-700">
            Catch confirmed for {flightDate}
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="px-4 py-3 bg-red-50 rounded-xl border border-red-200">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Save feedback */}
      {saved && !error && (
        <p className="text-center text-xs text-green-600 font-medium">Saved ✓</p>
      )}

      {/* Action buttons */}
      <div className="space-y-2 pt-1">
        <button
          type="button"
          onClick={() => sendUpdate(true)}
          disabled={loading}
          className="w-full h-14 rounded-xl bg-cyan-600 text-white font-bold text-base disabled:opacity-60 active:scale-[0.98] transition-transform"
        >
          {loading
            ? "Saving…"
            : confirmed
            ? "✓ Update & Re-confirm Catch"
            : `Confirm Catch for ${flightDate}`}
        </button>

        <button
          type="button"
          onClick={() => sendUpdate(false)}
          disabled={loading}
          className="w-full h-12 rounded-xl border border-gray-200 bg-white text-gray-600 font-medium text-sm disabled:opacity-60 active:scale-[0.98] transition-transform"
        >
          Save kg values only
        </button>
      </div>

      <p className="text-center text-xs text-gray-400 pb-1">
        Orders close {closeLabel} (Fiji time)
      </p>
    </div>
  );
}
