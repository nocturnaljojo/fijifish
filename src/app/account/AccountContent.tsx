"use client";

import { useState } from "react";
import Link from "next/link";
import { useCart } from "@/lib/cart";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AccountOrderItem {
  id: string;
  fish_species_id: string;
  fishName: string;
  quantity_kg: number;
  price_per_kg_aud_cents: number;
}

export interface AccountOrder {
  id: string;
  status: string;
  total_aud_cents: number;
  placed_at: string;
  items: AccountOrderItem[];
}

export interface VotedFish {
  id: string;
  name_fijian: string | null;
  name_english: string;
}

interface AccountContentProps {
  email: string | null;
  fullName: string | null;
  activeOrders: AccountOrder[];
  pastOrders: AccountOrder[];
  deliveryAddress: string | null;
  phone: string | null;
  votedFish: VotedFish[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatPrice(cents: number): string {
  return `A$${(cents / 100).toFixed(2)}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

function shortRef(id: string): string {
  return id.slice(-8).toUpperCase();
}

const STATUS_BADGE: Record<string, { label: string; bg: string; text: string; border: string }> = {
  pending:          { label: "Pending",          bg: "bg-sunset-gold/10",   text: "text-sunset-gold",  border: "border-sunset-gold/25" },
  confirmed:        { label: "Confirmed",         bg: "bg-ocean-teal/10",    text: "text-ocean-teal",   border: "border-ocean-teal/25" },
  paid:             { label: "Paid",              bg: "bg-ocean-teal/10",    text: "text-ocean-teal",   border: "border-ocean-teal/25" },
  out_for_delivery: { label: "Out for Delivery",  bg: "bg-lagoon-green/10",  text: "text-lagoon-green", border: "border-lagoon-green/25" },
  delivered:        { label: "Delivered",         bg: "bg-lagoon-green/10",  text: "text-lagoon-green", border: "border-lagoon-green/25" },
  cancelled:        { label: "Cancelled",         bg: "bg-reef-coral/10",    text: "text-reef-coral",   border: "border-reef-coral/25" },
  refunded:         { label: "Refunded",          bg: "bg-reef-coral/10",    text: "text-reef-coral",   border: "border-reef-coral/25" },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_BADGE[status] ?? { label: status, bg: "bg-white/5", text: "text-text-secondary", border: "border-white/10" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-widest border ${s.bg} ${s.text} ${s.border}`}>
      {s.label}
    </span>
  );
}

// ── Order card ────────────────────────────────────────────────────────────────

function OrderCard({ order, compact = false }: { order: AccountOrder; compact?: boolean }) {
  const { addItem, updateQuantity, openCart } = useCart();

  function handleReorder() {
    for (const item of order.items) {
      const qty = Math.max(1, Math.floor(item.quantity_kg));
      addItem({
        fishSpeciesId: item.fish_species_id,
        fishName: item.fishName,
        priceAudCents: item.price_per_kg_aud_cents,
        maxAvailableKg: qty + 9, // reasonable upper bound
      });
      if (qty > 1) updateQuantity(item.fish_species_id, qty - 1);
    }
    openCart();
  }

  return (
    <div className="bg-white/[0.03] border border-white/10 rounded-xl overflow-hidden">
      {/* Order header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-text-secondary">#{shortRef(order.id)}</span>
          <StatusBadge status={order.status} />
        </div>
        <span className="font-mono text-xs text-text-secondary">{formatDate(order.placed_at)}</span>
      </div>

      {/* Items */}
      {!compact && (
        <ul className="divide-y divide-white/5">
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
      )}

      {/* Footer: total + reorder */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-white/5">
        <div>
          {compact && (
            <p className="text-xs text-text-secondary font-mono mb-0.5">
              {order.items.length} item{order.items.length !== 1 ? "s" : ""}
            </p>
          )}
          <span className="font-mono font-bold text-sunset-gold text-sm">
            {formatPrice(order.total_aud_cents)}
          </span>
        </div>
        {order.status === "delivered" && (
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

// ── CopyButton ────────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }).catch(() => null);
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="px-2.5 py-1 text-xs font-mono rounded-lg bg-white/5 border border-white/10 text-text-secondary hover:text-text-primary hover:bg-white/10 transition-colors"
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AccountContent({
  email,
  fullName,
  activeOrders,
  pastOrders,
  deliveryAddress,
  phone,
  votedFish,
}: AccountContentProps) {
  const initials = (fullName ?? email ?? "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary, #0a0f1a)" }}>
      <div className="max-w-2xl mx-auto px-4 py-12 space-y-8">

        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-ocean-teal/15 border border-ocean-teal/25 flex items-center justify-center shrink-0">
            <span className="font-mono font-bold text-ocean-teal text-sm">{initials}</span>
          </div>
          <div>
            <p className="text-xs font-mono text-ocean-teal uppercase tracking-widest mb-0.5">My Account</p>
            <h1 className="text-xl font-bold text-text-primary leading-tight">
              {fullName ?? email ?? "Your Account"}
            </h1>
            {fullName && email && (
              <p className="text-xs text-text-secondary font-mono mt-0.5">{email}</p>
            )}
          </div>
        </div>

        {/* ── Section 1: Active Orders ──────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-mono text-text-secondary uppercase tracking-widest">Active Orders</h2>
            {activeOrders.length > 0 && (
              <span className="text-xs font-mono text-ocean-teal">{activeOrders.length} order{activeOrders.length !== 1 ? "s" : ""}</span>
            )}
          </div>

          {activeOrders.length === 0 ? (
            <div className="bg-white/[0.03] border border-white/10 rounded-xl p-6 text-center">
              <p className="text-text-secondary text-sm mb-3">No active orders</p>
              <Link
                href="/"
                className="inline-block px-4 py-2 rounded-lg bg-ocean-teal text-bg-primary font-semibold text-sm hover:opacity-90 transition-opacity"
              >
                Browse Fresh Fish →
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {activeOrders.map((order) => (
                <OrderCard key={order.id} order={order} compact={false} />
              ))}
            </div>
          )}
        </section>

        {/* ── Section 2: Order History ──────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-mono text-text-secondary uppercase tracking-widest">Order History</h2>
            {pastOrders.length > 0 && (
              <span className="text-xs font-mono text-text-secondary">{pastOrders.length} order{pastOrders.length !== 1 ? "s" : ""}</span>
            )}
          </div>

          {pastOrders.length === 0 ? (
            <div className="bg-white/[0.03] border border-white/10 rounded-xl p-5 text-center">
              <p className="text-text-secondary text-sm">Your first order is waiting!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {pastOrders.map((order) => (
                <OrderCard key={order.id} order={order} compact={true} />
              ))}
            </div>
          )}
        </section>

        {/* ── Section 3: Preferences ────────────────────────────────────────── */}
        <section>
          <h2 className="text-xs font-mono text-text-secondary uppercase tracking-widest mb-3">My Preferences</h2>

          <div className="bg-white/[0.03] border border-white/10 rounded-xl overflow-hidden">
            {/* Delivery address */}
            <div className="px-4 py-4 border-b border-white/5">
              <p className="text-xs font-mono text-text-secondary uppercase tracking-wider mb-1">Delivery Address</p>
              {deliveryAddress ? (
                <p className="text-sm text-text-primary">{deliveryAddress}</p>
              ) : (
                <p className="text-sm text-text-secondary italic">Saved after your first order</p>
              )}
            </div>

            {/* Phone */}
            <div className="px-4 py-4 border-b border-white/5">
              <p className="text-xs font-mono text-text-secondary uppercase tracking-wider mb-1">Phone</p>
              {phone ? (
                <p className="text-sm text-text-primary font-mono">{phone}</p>
              ) : (
                <p className="text-sm text-text-secondary italic">Not on file</p>
              )}
            </div>

            {/* Fish I&apos;ve voted to unlock */}
            <div className="px-4 py-4 border-b border-white/5">
              <p className="text-xs font-mono text-text-secondary uppercase tracking-wider mb-2">Fish I&apos;ve Voted to Unlock</p>
              {votedFish.length === 0 ? (
                <p className="text-sm text-text-secondary italic">
                  No votes yet —{" "}
                  <Link href="/#unlock-board" className="text-ocean-teal hover:underline">
                    vote to unlock new species
                  </Link>
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {votedFish.map((fish) => (
                    <span
                      key={fish.id}
                      className="px-2.5 py-1 rounded-full text-xs font-mono bg-deep-purple/10 text-deep-purple border border-deep-purple/20"
                    >
                      {fish.name_fijian ?? fish.name_english}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Referral — future feature teaser */}
            <div className="px-4 py-4">
              <p className="text-xs font-mono text-text-secondary uppercase tracking-wider mb-2">Referral Code</p>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm text-text-secondary bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 tracking-widest">
                  Coming soon
                </span>
                <CopyButton text="Coming soon" />
              </div>
              <p className="text-xs text-text-secondary mt-1.5">
                Referral rewards launching soon — earn credit for every friend who orders.
              </p>
            </div>
          </div>
        </section>

        <div className="text-center pt-2">
          <Link href="/" className="text-xs text-text-secondary hover:text-text-primary transition-colors font-mono">
            ← Back to shop
          </Link>
        </div>

      </div>
    </div>
  );
}
