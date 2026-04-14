"use client";

import { useCart } from "@/lib/cart";
import { getFlightWindowStatus } from "@/lib/flight-window-state";
import type { FlightWindowStatus, OrderStatus } from "@/types/database";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DashboardOrderItem {
  id: string;
  fish_species_id: string;
  fishName: string;
  quantity_kg: number;
  price_per_kg_aud_cents: number;
}

export interface DashboardOrder {
  id: string;
  status: string;
  total_aud_cents: number;
  placed_at: string;
  delivery_address: string | null;
  delivery_notes: string | null;
  items: DashboardOrderItem[];
  zone_name: string | null;
  zone_state: string | null;
  window: {
    id: string;
    flight_date: string;
    flight_number: string | null;
    db_status: string; // raw DB status — used by state machine
    order_open_at: string;
    order_close_at: string;
  } | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatPrice(cents: number): string {
  return `A$${(cents / 100).toFixed(2)}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Australia/Sydney",
  });
}

function shortRef(id: string): string {
  return id.slice(-8).toUpperCase();
}

// ── Status badge ──────────────────────────────────────────────────────────────

interface BadgeStyle {
  label: string;
  bg: string;
  text: string;
  border: string;
}

const ORDER_BADGE: Record<string, BadgeStyle> = {
  pending:          { label: "Pending",         bg: "bg-sunset-gold/10",  text: "text-sunset-gold",  border: "border-sunset-gold/25" },
  confirmed:        { label: "Confirmed",        bg: "bg-ocean-teal/10",   text: "text-ocean-teal",   border: "border-ocean-teal/25" },
  paid:             { label: "Confirmed",        bg: "bg-ocean-teal/10",   text: "text-ocean-teal",   border: "border-ocean-teal/25" },
  payment_failed:   { label: "Payment Failed",   bg: "bg-reef-coral/10",   text: "text-reef-coral",   border: "border-reef-coral/25" },
  out_for_delivery: { label: "Out for Delivery", bg: "bg-lagoon-green/10", text: "text-lagoon-green", border: "border-lagoon-green/25" },
  delivered:        { label: "Delivered",        bg: "bg-lagoon-green/10", text: "text-lagoon-green font-bold", border: "border-lagoon-green/30" },
  cancelled:        { label: "Cancelled",        bg: "bg-white/5",         text: "text-text-secondary", border: "border-white/10" },
  refunded:         { label: "Refunded",         bg: "bg-white/5",         text: "text-text-secondary", border: "border-white/10" },
};

const WINDOW_BADGE: Partial<Record<FlightWindowStatus, BadgeStyle>> = {
  packing:    { label: "Being packed",     bg: "bg-ocean-teal/10",   text: "text-ocean-teal",   border: "border-ocean-teal/25" },
  shipped:    { label: "On the plane",     bg: "bg-ocean-teal/10",   text: "text-ocean-teal",   border: "border-ocean-teal/25" },
  in_transit: { label: "In transit",       bg: "bg-ocean-teal/10",   text: "text-ocean-teal",   border: "border-ocean-teal/25" },
  landed:     { label: "Flight landed",    bg: "bg-ocean-teal/10",   text: "text-ocean-teal",   border: "border-ocean-teal/25" },
  customs:    { label: "Customs check",    bg: "bg-sunset-gold/10",  text: "text-sunset-gold",  border: "border-sunset-gold/25" },
  delivering: { label: "Out for delivery", bg: "bg-lagoon-green/10", text: "text-lagoon-green", border: "border-lagoon-green/25" },
  delivered:  { label: "Delivered",        bg: "bg-lagoon-green/10", text: "text-lagoon-green font-bold", border: "border-lagoon-green/30" },
  cancelled:  { label: "Window cancelled", bg: "bg-reef-coral/10",   text: "text-reef-coral",   border: "border-reef-coral/25" },
};

function StatusBadge({ style }: { style: BadgeStyle }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-widest border ${style.bg} ${style.text} ${style.border}`}
    >
      {style.label}
    </span>
  );
}

function getWindowStatusDisplay(
  window: DashboardOrder["window"],
): FlightWindowStatus | null {
  if (!window) return null;
  return getFlightWindowStatus(
    {
      order_open_at: window.order_open_at,
      order_close_at: window.order_close_at,
      status: window.db_status as FlightWindowStatus,
    },
    new Date(),
  );
}

// ── OrderCard ─────────────────────────────────────────────────────────────────

export default function OrderCard({ order }: { order: DashboardOrder }) {
  const { addItem, updateQuantity, openCart } = useCart();

  const orderStatus = order.status as OrderStatus;
  const windowStatus = getWindowStatusDisplay(order.window);

  function handleReorder() {
    for (const item of order.items) {
      const qty = Math.max(1, Math.floor(item.quantity_kg));
      addItem({
        fishSpeciesId: item.fish_species_id,
        fishName: item.fishName,
        priceAudCents: item.price_per_kg_aud_cents,
        maxAvailableKg: qty + 9,
      });
      if (qty > 1) updateQuantity(item.fish_species_id, qty - 1);
    }
    openCart();
  }

  const orderBadge = ORDER_BADGE[orderStatus] ?? {
    label: orderStatus,
    bg: "bg-white/5",
    text: "text-text-secondary",
    border: "border-white/10",
  };

  const windowBadge = windowStatus ? WINDOW_BADGE[windowStatus] : null;

  return (
    <div className="bg-white/[0.03] border border-white/10 rounded-xl overflow-hidden">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: "rgba(255,255,255,0.05)" }}
      >
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="font-mono text-xs text-text-secondary">
            #{shortRef(order.id)}
          </span>
          <StatusBadge style={orderBadge} />
          {/* Show window status if it adds info beyond the order status */}
          {windowBadge &&
            !["delivered", "cancelled", "refunded", "payment_failed"].includes(orderStatus) && (
              <StatusBadge style={windowBadge} />
            )}
        </div>
        <span className="font-mono text-xs text-text-secondary whitespace-nowrap">
          {formatDate(order.placed_at)}
        </span>
      </div>

      {/* ── Items ──────────────────────────────────────────────────────── */}
      <ul className="divide-y" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
        {order.items.map((item) => (
          <li key={item.id} className="flex items-center justify-between px-4 py-2.5">
            <div>
              <p className="text-sm font-medium text-text-primary">{item.fishName}</p>
              <p className="text-xs font-mono text-text-secondary">
                {item.quantity_kg} kg × {formatPrice(item.price_per_kg_aud_cents)}/kg
              </p>
            </div>
            <span className="font-mono text-sm font-bold text-sunset-gold">
              {formatPrice(item.price_per_kg_aud_cents * item.quantity_kg)}
            </span>
          </li>
        ))}
      </ul>

      {/* ── Delivery info ──────────────────────────────────────────────── */}
      {(order.zone_name ?? order.delivery_address) && (
        <div
          className="px-4 py-3 border-t"
          style={{ borderColor: "rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.01)" }}
        >
          <p className="text-[10px] font-mono text-text-secondary uppercase tracking-widest mb-1">
            Delivery
          </p>
          {order.zone_name && (
            <p className="text-xs text-text-secondary font-mono">
              {order.zone_name}
              {order.zone_state ? `, ${order.zone_state}` : ""}
            </p>
          )}
          {order.delivery_address && (
            <p className="text-xs text-text-primary mt-0.5">{order.delivery_address}</p>
          )}
          {order.delivery_notes && (
            <p className="text-[10px] text-text-secondary mt-0.5 italic">{order.delivery_notes}</p>
          )}
        </div>
      )}

      {/* ── Flight window info ─────────────────────────────────────────── */}
      {order.window && (
        <div
          className="px-4 py-3 border-t"
          style={{ borderColor: "rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.01)" }}
        >
          <p className="text-[10px] font-mono text-text-secondary uppercase tracking-widest mb-1">
            Flight
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono text-text-secondary">
              ✈️ {order.window.flight_number ?? "FJ-"}
            </span>
            <span className="text-xs font-mono text-text-secondary">
              {formatDate(order.window.flight_date + "T00:00:00")}
            </span>
            {windowStatus && (
              <span
                className={`text-[10px] font-mono uppercase tracking-wider ${
                  ["in_transit", "shipped", "packing"].includes(windowStatus)
                    ? "text-ocean-teal"
                    : windowStatus === "delivering" || windowStatus === "landed"
                    ? "text-lagoon-green"
                    : "text-text-secondary"
                }`}
              >
                · {windowStatus.replace(/_/g, " ")}
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── Footer: total + reorder ─────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-4 py-3 border-t"
        style={{ borderColor: "rgba(255,255,255,0.05)" }}
      >
        <span className="font-mono font-bold text-sunset-gold text-sm">
          {formatPrice(order.total_aud_cents)}
        </span>

        {orderStatus === "delivered" && (
          <button
            type="button"
            onClick={handleReorder}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-ocean-teal/10 text-ocean-teal border border-ocean-teal/25 hover:bg-ocean-teal/20 transition-colors"
          >
            Reorder
          </button>
        )}
      </div>
    </div>
  );
}
