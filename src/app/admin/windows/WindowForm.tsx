"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  markAsPacking,
  markAsShipped,
  markAsInTransit,
  markAsLanded,
  markAsCustomsCleared,
  markAsDelivering,
  markAsDelivered,
  cancelWindow,
} from "@/lib/flight-window-actions";

type WindowRow = {
  id: string;
  flight_date: string;
  flight_number: string | null;
  order_open_at: string;
  order_close_at: string;
  status: string;
  notes: string | null;
  orderCount?: number;
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

// ── Status badge colour ───────────────────────────────────────────────────────

function statusColor(status: string) {
  if (["open", "delivered"].includes(status)) return "#66bb6a";
  if (status === "closing_soon") return "#ffab40";
  if (["cancelled"].includes(status)) return "#ff7043";
  if (["shipped", "in_transit", "delivering", "landed", "customs", "packing"].includes(status)) return "#4fc3f7";
  return "#90a4ae"; // upcoming, closed, unknown
}

// ── Window row with full state machine ───────────────────────────────────────

export function WindowRow({ window: w }: { window: WindowRow }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(label: string, action: () => Promise<unknown>) {
    setLoading(label);
    setError(null);
    try {
      await action();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setLoading(null);
    }
  }

  function btn(
    label: string,
    action: () => Promise<unknown>,
    colorClass: string,
  ) {
    return (
      <button
        key={label}
        type="button"
        disabled={loading !== null}
        onClick={() => run(label, action)}
        className={`px-3 py-1.5 rounded-lg text-xs font-mono hover:opacity-80 disabled:opacity-40 transition-opacity ${colorClass}`}
      >
        {loading === label ? "..." : label}
      </button>
    );
  }

  const s = w.status;
  const teal = "bg-ocean-teal/10 border border-ocean-teal/30 text-ocean-teal";
  const gold = "bg-sunset-gold/10 border border-sunset-gold/30 text-sunset-gold";
  const green = "bg-lagoon-green/10 border border-lagoon-green/30 text-lagoon-green";
  const coral = "bg-reef-coral/10 border border-reef-coral/30 text-reef-coral";

  // Build action buttons based on DB status
  const actions: React.ReactNode[] = [];

  // Time-driven transitions (via raw API — these update DB so state machine can compute)
  if (s === "upcoming") {
    actions.push(btn("Open", () =>
      fetch("/api/admin/windows", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: w.id, status: "open" }),
      }), green));
  }
  if (s === "open") {
    actions.push(btn("Closing Soon", () =>
      fetch("/api/admin/windows", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: w.id, status: "closing_soon" }),
      }), gold));
  }
  if (["open", "closing_soon"].includes(s)) {
    actions.push(btn("Close Orders", () =>
      fetch("/api/admin/windows", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: w.id, status: "closed" }),
      }), coral));
  }

  // Admin-driven transitions via server actions
  if (s === "closed") {
    actions.push(btn("Mark Packing", () => markAsPacking(w.id), teal));
  }
  if (s === "packing") {
    actions.push(btn("Mark Shipped", () => markAsShipped(w.id, w.flight_number ?? undefined), teal));
  }
  if (s === "shipped") {
    actions.push(btn("In Transit", () => markAsInTransit(w.id), teal));
    actions.push(btn("Landed", () => markAsLanded(w.id), teal));
  }
  if (s === "in_transit") {
    actions.push(btn("Landed", () => markAsLanded(w.id), teal));
  }
  if (s === "landed") {
    actions.push(btn("Customs Cleared", () => markAsCustomsCleared(w.id), teal));
  }
  if (s === "customs") {
    actions.push(btn("Out for Delivery", () => markAsDelivering(w.id), teal));
  }
  if (s === "delivering") {
    actions.push(btn("Mark Delivered", () => markAsDelivered(w.id), green));
  }

  // Cancel — available on any non-terminal state
  if (!["delivered", "cancelled"].includes(s)) {
    actions.push(
      <button
        key="cancel"
        type="button"
        disabled={loading !== null}
        onClick={() => {
          const reason = window.prompt("Cancellation reason (optional):") ?? undefined;
          if (reason === null) return; // user dismissed
          void run("Cancelling", () => cancelWindow(w.id, reason || undefined));
        }}
        className={`px-3 py-1.5 rounded-lg text-xs font-mono disabled:opacity-40 transition-opacity ${coral}`}
      >
        {loading === "Cancelling" ? "..." : "Cancel Window"}
      </button>
    );
  }

  const color = statusColor(s);
  const dateLabel = new Date(w.flight_date + "T00:00:00").toLocaleDateString("en-AU", {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
  });

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-5 flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} aria-hidden="true" />
            <span className="text-xs font-mono uppercase tracking-widest" style={{ color }}>{s}</span>
            {w.flight_number && (
              <span className="text-xs font-mono text-text-secondary">· {w.flight_number}</span>
            )}
            {typeof w.orderCount === "number" && (
              <span className="ml-auto text-xs font-mono text-text-secondary">
                {w.orderCount} order{w.orderCount !== 1 ? "s" : ""}
              </span>
            )}
          </div>
          <p className="font-bold text-text-primary">{dateLabel}</p>
          <p className="text-xs text-text-secondary mt-0.5">
            Opens: {toDatetimeLocal(w.order_open_at).replace("T", " ")}
            {" · "}
            Closes: {toDatetimeLocal(w.order_close_at).replace("T", " ")} UTC
          </p>
          {w.notes && <p className="text-xs text-text-secondary mt-1 italic">{w.notes}</p>}
        </div>
      </div>

      {/* Action buttons */}
      {actions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {actions}
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="text-xs text-reef-coral font-mono">{error}</p>
      )}
    </div>
  );
}
