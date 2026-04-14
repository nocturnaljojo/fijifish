"use client";

import { useState } from "react";

export type AdminOrderRow = {
  id: string;
  status: string;
  total_aud_cents: number;
  delivery_fee_aud_cents: number;
  placed_at: string;
  delivery_address: string | null;
  delivery_notes: string | null;
  stripe_payment_intent_id: string | null;
  customer: {
    full_name: string | null;
    email: string;
    phone: string | null;
  } | null;
  flight_window: {
    flight_date: string;
    flight_number: string | null;
  } | null;
  delivery_zone: { name: string } | null;
  items: {
    id: string;
    quantity_kg: number;
    price_per_kg_aud_cents: number;
    fish_species: { name_fijian: string | null; name_english: string } | null;
    village: { name: string } | null;
  }[];
};

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-yellow-500/10 border border-yellow-500/30 text-yellow-400",
  confirmed: "bg-blue-500/10 border border-blue-500/30 text-blue-400",
  paid: "bg-lagoon-green/10 border border-lagoon-green/30 text-lagoon-green",
  payment_failed: "bg-reef-coral/10 border border-reef-coral/30 text-reef-coral",
  out_for_delivery: "bg-ocean-teal/10 border border-ocean-teal/30 text-ocean-teal",
  delivered: "bg-lagoon-green/10 border border-lagoon-green/30 text-lagoon-green",
  cancelled: "bg-white/5 border border-white/20 text-text-secondary",
  refunded: "bg-purple-500/10 border border-purple-500/30 text-purple-400",
};

function fmt(cents: number) {
  return `A$${(cents / 100).toFixed(2)}`;
}

function OrderRow({ order }: { order: AdminOrderRow }) {
  const [expanded, setExpanded] = useState(false);

  const statusCls = STATUS_BADGE[order.status] ?? "bg-white/5 border border-white/20 text-text-secondary";
  const total = fmt(order.total_aud_cents);
  const customerName = order.customer?.full_name ?? order.customer?.email ?? "Unknown";
  const placedAt = new Date(order.placed_at).toLocaleDateString("en-AU", {
    day: "numeric", month: "short", year: "numeric",
  });
  const flightLabel = order.flight_window
    ? `${order.flight_window.flight_date}${order.flight_window.flight_number ? ` · ${order.flight_window.flight_number}` : ""}`
    : "—";

  return (
    <>
      <tr
        className="border-b border-white/5 hover:bg-white/3 cursor-pointer transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <td className="px-4 py-3">
          <p className="text-sm font-medium text-text-primary">{customerName}</p>
          <p className="text-xs text-text-secondary font-mono">{order.customer?.email}</p>
        </td>
        <td className="px-4 py-3 hidden sm:table-cell">
          <span className="text-xs font-mono text-text-secondary">{flightLabel}</span>
        </td>
        <td className="px-4 py-3">
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono uppercase ${statusCls}`}>
            {order.status}
          </span>
        </td>
        <td className="px-4 py-3 text-right">
          <span className="text-sm font-bold text-text-primary font-mono">{total}</span>
        </td>
        <td className="px-4 py-3 hidden md:table-cell text-xs text-text-secondary">
          {placedAt}
        </td>
        <td className="px-4 py-3 text-center">
          <span className="text-text-secondary text-xs">{expanded ? "▲" : "▼"}</span>
        </td>
      </tr>

      {expanded && (
        <tr className="bg-bg-tertiary border-b border-white/5">
          <td colSpan={6} className="px-5 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Order details */}
              <div>
                <p className="text-xs font-mono text-text-secondary uppercase tracking-wider mb-2">Order Details</p>
                <div className="space-y-1 text-xs text-text-secondary">
                  <p>
                    <span className="text-text-primary font-medium">ID: </span>
                    <span className="font-mono">{order.id}</span>
                  </p>
                  {order.stripe_payment_intent_id && (
                    <p>
                      <span className="text-text-primary font-medium">Stripe PI: </span>
                      <span className="font-mono">{order.stripe_payment_intent_id}</span>
                    </p>
                  )}
                  <p>
                    <span className="text-text-primary font-medium">Zone: </span>
                    {order.delivery_zone?.name ?? "—"}
                  </p>
                  {order.delivery_address && (
                    <p>
                      <span className="text-text-primary font-medium">Address: </span>
                      {order.delivery_address}
                    </p>
                  )}
                  {order.delivery_notes && (
                    <p>
                      <span className="text-text-primary font-medium">Notes: </span>
                      {order.delivery_notes}
                    </p>
                  )}
                  <p>
                    <span className="text-text-primary font-medium">Delivery fee: </span>
                    {fmt(order.delivery_fee_aud_cents)}
                  </p>
                </div>
              </div>

              {/* Order items */}
              <div>
                <p className="text-xs font-mono text-text-secondary uppercase tracking-wider mb-2">Items</p>
                <div className="space-y-1.5">
                  {order.items.map((item) => {
                    const name = item.fish_species?.name_fijian ?? item.fish_species?.name_english ?? "Unknown";
                    const lineTotal = (item.quantity_kg * item.price_per_kg_aud_cents) / 100;
                    return (
                      <div key={item.id} className="flex items-center justify-between text-xs">
                        <span className="text-text-primary">
                          {name}
                          {item.village && (
                            <span className="text-text-secondary ml-1">({item.village.name})</span>
                          )}
                        </span>
                        <span className="font-mono text-text-secondary">
                          {item.quantity_kg}kg × {fmt(item.price_per_kg_aud_cents)}/kg = A${lineTotal.toFixed(2)}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-2 pt-2 border-t border-white/10 flex justify-between text-xs font-bold">
                  <span className="text-text-secondary">Total</span>
                  <span className="text-text-primary font-mono">{total}</span>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function OrdersTable({ orders }: { orders: AdminOrderRow[] }) {
  if (orders.length === 0) {
    return (
      <div className="py-20 text-center border border-dashed border-white/20 rounded-xl">
        <span className="text-4xl block mb-3" aria-hidden="true">📦</span>
        <p className="text-text-secondary text-sm">No orders match this filter.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-white/10">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/10 bg-white/3">
            <th className="px-4 py-3 text-left text-xs font-mono text-text-secondary uppercase tracking-wider">Customer</th>
            <th className="px-4 py-3 text-left text-xs font-mono text-text-secondary uppercase tracking-wider hidden sm:table-cell">Flight</th>
            <th className="px-4 py-3 text-left text-xs font-mono text-text-secondary uppercase tracking-wider">Status</th>
            <th className="px-4 py-3 text-right text-xs font-mono text-text-secondary uppercase tracking-wider">Total</th>
            <th className="px-4 py-3 text-left text-xs font-mono text-text-secondary uppercase tracking-wider hidden md:table-cell">Placed</th>
            <th className="px-4 py-3 text-center text-xs font-mono text-text-secondary uppercase tracking-wider w-10"></th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <OrderRow key={o.id} order={o} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
