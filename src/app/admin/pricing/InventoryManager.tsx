"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Species {
  id: string;
  name_fijian: string | null;
  name_english: string;
}

interface Village {
  id: string;
  name: string;
}

interface Window {
  id: string;
  flight_date: string;
  flight_number: string | null;
  status: string;
}

interface InventoryRow {
  id: string;
  fish_species_id: string;
  village_id: string;
  total_capacity_kg: number;
  reserved_kg: number;
  available_kg: number;
  price_aud_cents: number;
  price_fjd_cents: number;
  fish_species: { name_fijian: string | null; name_english: string } | null;
  villages: { name: string } | null;
}

// ── Add species form ──────────────────────────────────────────────────────────

function AddInventoryRow({
  windowId,
  species,
  villages,
  existingSpeciesIds,
}: {
  windowId: string;
  species: Species[];
  villages: Village[];
  existingSpeciesIds: string[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableSpecies = species.filter((s) => !existingSpeciesIds.includes(s.id));

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const fd = new FormData(e.currentTarget);

    const res = await fetch("/api/admin/pricing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        flight_window_id: windowId,
        fish_species_id: fd.get("fish_species_id"),
        village_id: fd.get("village_id"),
        total_capacity_kg: Number(fd.get("total_capacity_kg")),
        reserved_kg: 0,
        price_aud_cents: Math.round(Number(fd.get("price_aud")) * 100),
        price_fjd_cents: Math.round(Number(fd.get("price_fjd")) * 100),
      }),
    });

    const json = await res.json() as { error?: string };
    setLoading(false);
    if (!res.ok) { setError(json.error ?? "Failed"); return; }
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={availableSpecies.length === 0}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-ocean-teal/30 text-ocean-teal text-xs font-mono hover:bg-ocean-teal/5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        + Add Species
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white/5 border border-ocean-teal/20 rounded-xl p-4 flex flex-col gap-3 mt-3">
      <h4 className="text-sm font-bold text-text-primary">Add Species to Window</h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-mono text-text-secondary">Species *</span>
          <select name="fish_species_id" required className="admin-input">
            {availableSpecies.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name_fijian ?? s.name_english}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-mono text-text-secondary">Village *</span>
          <select name="village_id" required className="admin-input">
            {villages.map((v) => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-mono text-text-secondary">AUD Price / kg</span>
          <input type="number" name="price_aud" step="0.01" min="0" defaultValue="35" required className="admin-input" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-mono text-text-secondary">FJD Price / kg</span>
          <input type="number" name="price_fjd" step="0.01" min="0" defaultValue="0" className="admin-input" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-mono text-text-secondary">Total Capacity (kg)</span>
          <input type="number" name="total_capacity_kg" step="0.5" min="0" defaultValue="100" required className="admin-input" />
        </label>
      </div>
      {error && <p className="text-xs text-reef-coral font-mono">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={loading} className="px-3 py-1.5 rounded-lg bg-ocean-teal text-bg-primary text-xs font-bold hover:opacity-90 disabled:opacity-50">
          {loading ? "Saving..." : "Add"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="px-3 py-1.5 rounded-lg border border-white/20 text-text-secondary text-xs hover:text-text-primary">
          Cancel
        </button>
      </div>
    </form>
  );
}

// ── Editable cell ─────────────────────────────────────────────────────────────

function EditableCell({
  rowId,
  field,
  value,
  isPrice,
}: {
  rowId: string;
  field: string;
  value: number;
  isPrice?: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [local, setLocal] = useState(isPrice ? String(value / 100) : String(value));
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const numValue = isPrice ? Math.round(parseFloat(local) * 100) : parseFloat(local);
    await fetch("/api/admin/pricing", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: rowId, [field]: numValue }),
    });
    setSaving(false);
    setEditing(false);
    router.refresh();
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        {isPrice && <span className="text-text-secondary text-xs">A$</span>}
        <input
          type="number"
          step={isPrice ? "0.01" : "0.5"}
          min="0"
          value={local}
          onChange={(e) => setLocal(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") setEditing(false); }}
          autoFocus
          className="w-20 px-1.5 py-0.5 text-xs font-mono bg-bg-tertiary border border-ocean-teal/40 rounded text-text-primary focus:outline-none"
        />
        {saving && <span className="text-xs text-text-secondary">...</span>}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="text-xs font-mono text-sunset-gold hover:text-[#ffc166] transition-colors tabular-nums"
      title="Click to edit"
    >
      {isPrice ? `A$${(value / 100).toFixed(2)}` : `${value} kg`}
    </button>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function InventoryManager({
  windows,
  species,
  villages,
  inventory,
  selectedWindowId,
}: {
  windows: Window[];
  species: Species[];
  villages: Village[];
  inventory: InventoryRow[];
  selectedWindowId: string | null;
}) {
  const router = useRouter();

  function handleWindowChange(e: React.ChangeEvent<HTMLSelectElement>) {
    router.push(`/admin/pricing?window=${e.target.value}`);
  }

  const existingSpeciesIds = inventory.map((r) => r.fish_species_id);

  return (
    <div className="flex flex-col gap-6">
      {/* Window selector */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <label className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
          <span className="text-xs font-mono text-text-secondary uppercase tracking-wider shrink-0">Flight Window</span>
          <select
            value={selectedWindowId ?? ""}
            onChange={handleWindowChange}
            className="admin-input sm:w-72"
          >
            <option value="">— Select a window —</option>
            {windows.map((w) => (
              <option key={w.id} value={w.id}>
                {w.flight_date} · {w.flight_number ?? "FJ911"} · {w.status}
              </option>
            ))}
          </select>
        </label>
        {selectedWindowId && (
          <AddInventoryRow
            windowId={selectedWindowId}
            species={species}
            villages={villages}
            existingSpeciesIds={existingSpeciesIds}
          />
        )}
      </div>

      {/* Inventory table */}
      {selectedWindowId && (
        <div>
          {inventory.length === 0 ? (
            <div className="py-12 text-center border border-dashed border-white/20 rounded-xl">
              <p className="text-text-secondary text-sm">No species added to this window yet.</p>
              <p className="text-text-secondary text-xs mt-1">Click &ldquo;+ Add Species&rdquo; above to set prices and capacity.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 bg-white/3">
                    <th className="text-left px-4 py-3 text-xs font-mono text-text-secondary uppercase tracking-wider">Species</th>
                    <th className="text-left px-4 py-3 text-xs font-mono text-text-secondary uppercase tracking-wider">Village</th>
                    <th className="text-left px-4 py-3 text-xs font-mono text-text-secondary uppercase tracking-wider">AUD Price/kg</th>
                    <th className="text-left px-4 py-3 text-xs font-mono text-text-secondary uppercase tracking-wider">Total (kg)</th>
                    <th className="text-left px-4 py-3 text-xs font-mono text-text-secondary uppercase tracking-wider">Reserved</th>
                    <th className="text-left px-4 py-3 text-xs font-mono text-text-secondary uppercase tracking-wider">Available</th>
                    <th className="text-left px-4 py-3 text-xs font-mono text-text-secondary uppercase tracking-wider">Fill %</th>
                  </tr>
                </thead>
                <tbody>
                  {inventory.map((row) => {
                    const fillPct = row.total_capacity_kg > 0
                      ? Math.round((row.reserved_kg / row.total_capacity_kg) * 100)
                      : 0;
                    const fillColor = fillPct >= 80 ? "#ff7043" : fillPct >= 50 ? "#ffab40" : "#4fc3f7";
                    return (
                      <tr key={row.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                        <td className="px-4 py-3 font-medium text-text-primary">
                          {row.fish_species?.name_fijian ?? row.fish_species?.name_english ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-text-secondary text-xs">
                          {row.villages?.name ?? "—"}
                        </td>
                        <td className="px-4 py-3">
                          <EditableCell rowId={row.id} field="price_aud_cents" value={row.price_aud_cents} isPrice />
                        </td>
                        <td className="px-4 py-3">
                          <EditableCell rowId={row.id} field="total_capacity_kg" value={row.total_capacity_kg} />
                        </td>
                        <td className="px-4 py-3">
                          <EditableCell rowId={row.id} field="reserved_kg" value={row.reserved_kg} />
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-lagoon-green">
                          {Number(row.available_kg).toFixed(1)} kg
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs font-bold" style={{ color: fillColor }}>
                            {fillPct}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
