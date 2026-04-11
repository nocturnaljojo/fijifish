"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type WindowRow = {
  id: string;
  flight_date: string;
  flight_number: string | null;
  order_open_at: string;
  order_close_at: string;
  status: string;
  notes: string | null;
};

function toDatetimeLocal(iso: string): string {
  return iso.slice(0, 16); // "YYYY-MM-DDTHH:MM"
}

// ── Create form ───────────────────────────────────────────────────────────────

export function CreateWindowForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const fd = new FormData(e.currentTarget);

    const res = await fetch("/api/admin/windows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        flight_date: fd.get("flight_date"),
        flight_number: fd.get("flight_number") || null,
        order_open_at: fd.get("order_open_at") ? new Date(fd.get("order_open_at") as string).toISOString() : null,
        order_close_at: fd.get("order_close_at") ? new Date(fd.get("order_close_at") as string).toISOString() : null,
        status: fd.get("status"),
        notes: fd.get("notes") || null,
      }),
    });

    const json = await res.json() as { error?: string };
    setLoading(false);
    if (!res.ok) { setError(json.error ?? "Failed to create window"); return; }
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-ocean-teal text-bg-primary text-sm font-bold hover:opacity-90 transition-opacity"
      >
        + New Flight Window
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white/5 border border-white/10 rounded-xl p-6 flex flex-col gap-4"
    >
      <h3 className="font-bold text-text-primary">New Flight Window</h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-mono text-text-secondary uppercase tracking-wider">Flight Date *</span>
          <input type="date" name="flight_date" required className="admin-input" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-mono text-text-secondary uppercase tracking-wider">Flight Number</span>
          <input type="text" name="flight_number" defaultValue="FJ911" placeholder="FJ911" className="admin-input" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-mono text-text-secondary uppercase tracking-wider">Orders Open At *</span>
          <input type="datetime-local" name="order_open_at" required className="admin-input" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-mono text-text-secondary uppercase tracking-wider">Orders Close At *</span>
          <input type="datetime-local" name="order_close_at" required className="admin-input" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-mono text-text-secondary uppercase tracking-wider">Status</span>
          <select name="status" className="admin-input">
            <option value="upcoming">Upcoming</option>
            <option value="open">Open</option>
            <option value="closing_soon">Closing Soon</option>
            <option value="closed">Closed</option>
          </select>
        </label>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-xs font-mono text-text-secondary uppercase tracking-wider">Notes</span>
        <textarea name="notes" rows={2} className="admin-input resize-none" placeholder="Optional notes..." />
      </label>

      {error && <p className="text-sm text-reef-coral font-mono">{error}</p>}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 rounded-lg bg-ocean-teal text-bg-primary text-sm font-bold hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {loading ? "Creating..." : "Create Window"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="px-4 py-2 rounded-lg border border-white/20 text-text-secondary text-sm hover:text-text-primary transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// ── Status badge ─────────────────────────────────────────────────────────────

function statusColor(status: string) {
  if (status === "open") return "#66bb6a";
  if (status === "closing_soon") return "#ffab40";
  if (status === "closed" || status === "cancelled") return "#ff7043";
  if (["shipped", "in_transit", "delivering"].includes(status)) return "#4fc3f7";
  if (status === "delivered") return "#66bb6a";
  return "#90a4ae";
}

// ── Window row with inline status change ────────────────────────────────────

export function WindowRow({ window: w }: { window: WindowRow }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function setStatus(status: string) {
    setLoading(true);
    await fetch("/api/admin/windows", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: w.id, status }),
    });
    setLoading(false);
    router.refresh();
  }

  const color = statusColor(w.status);

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ background: color }}
            aria-hidden="true"
          />
          <span className="text-xs font-mono uppercase tracking-widest" style={{ color }}>
            {w.status}
          </span>
          {w.flight_number && (
            <span className="text-xs font-mono text-text-secondary">· {w.flight_number}</span>
          )}
        </div>
        <p className="font-bold text-text-primary">{w.flight_date}</p>
        <p className="text-xs text-text-secondary mt-0.5">
          Opens: {toDatetimeLocal(w.order_open_at).replace("T", " ")}
          {" · "}
          Closes: {toDatetimeLocal(w.order_close_at).replace("T", " ")} UTC
        </p>
        {w.notes && <p className="text-xs text-text-secondary mt-1 italic">{w.notes}</p>}
      </div>

      {/* Quick status actions */}
      <div className="flex flex-wrap gap-2 shrink-0">
        {w.status === "upcoming" && (
          <button
            type="button"
            disabled={loading}
            onClick={() => setStatus("open")}
            className="px-3 py-1.5 rounded-lg bg-lagoon-green/10 border border-lagoon-green/30 text-lagoon-green text-xs font-mono hover:bg-lagoon-green/20 disabled:opacity-50 transition-colors"
          >
            Open
          </button>
        )}
        {w.status === "open" && (
          <button
            type="button"
            disabled={loading}
            onClick={() => setStatus("closing_soon")}
            className="px-3 py-1.5 rounded-lg bg-sunset-gold/10 border border-sunset-gold/30 text-sunset-gold text-xs font-mono hover:bg-sunset-gold/20 disabled:opacity-50 transition-colors"
          >
            Closing Soon
          </button>
        )}
        {["open", "closing_soon"].includes(w.status) && (
          <button
            type="button"
            disabled={loading}
            onClick={() => setStatus("closed")}
            className="px-3 py-1.5 rounded-lg bg-reef-coral/10 border border-reef-coral/30 text-reef-coral text-xs font-mono hover:bg-reef-coral/20 disabled:opacity-50 transition-colors"
          >
            Close
          </button>
        )}
        {w.status === "closed" && (
          <button
            type="button"
            disabled={loading}
            onClick={() => setStatus("shipped")}
            className="px-3 py-1.5 rounded-lg bg-ocean-teal/10 border border-ocean-teal/30 text-ocean-teal text-xs font-mono hover:bg-ocean-teal/20 disabled:opacity-50 transition-colors"
          >
            Mark Shipped
          </button>
        )}
      </div>
    </div>
  );
}
