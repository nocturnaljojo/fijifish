"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCart } from "@/lib/cart";

interface DeliveryDetails {
  name: string;
  phone: string;
  address: string;
  suburb: string;
  postcode: string;
  state: string;
  notes: string;
}

function formatPrice(cents: number): string {
  return `A$${(cents / 100).toFixed(2)}`;
}

export default function CheckoutForm() {
  const router = useRouter();
  const { items, totalCents, clearCart } = useCart();
  const [mounted, setMounted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [delivery, setDelivery] = useState<DeliveryDetails>({
    name: "", phone: "", address: "", suburb: "", postcode: "", state: "NSW", notes: "",
  });

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  // Redirect home if cart is empty once mounted
  useEffect(() => {
    if (mounted && items.length === 0) router.push("/#fish-grid");
  }, [mounted, items.length, router]);

  function updateDelivery(field: keyof DeliveryDetails, value: string) {
    setDelivery((prev) => ({ ...prev, [field]: value }));
  }

  const isValid =
    delivery.name.trim().length >= 2 &&
    delivery.phone.trim().length >= 8 &&
    delivery.address.trim().length >= 5 &&
    delivery.suburb.trim().length >= 2 &&
    /^\d{4}$/.test(delivery.postcode);

  async function handleSubmit() {
    if (!isValid || submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({ fishSpeciesId: i.fishSpeciesId, quantityKg: i.quantityKg })),
          delivery,
        }),
      });

      const data = (await res.json()) as { checkoutUrl?: string; error?: string };

      if (!res.ok || !data.checkoutUrl) {
        setError(data.error ?? "Failed to create checkout session. Please try again.");
        setSubmitting(false);
        return;
      }

      clearCart();
      window.location.href = data.checkoutUrl;
    } catch {
      setError("Network error — please check your connection and try again.");
      setSubmitting(false);
    }
  }

  if (!mounted || items.length === 0) {
    return (
      <div className="py-20 text-center">
        <div className="h-8 w-48 bg-white/5 rounded animate-pulse mx-auto" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Order summary */}
      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-white/10">
          <h2 className="text-sm font-mono text-text-secondary uppercase tracking-wider">Order Summary</h2>
        </div>
        <ul className="divide-y divide-white/5">
          {items.map((item) => (
            <li key={item.fishSpeciesId} className="flex items-center justify-between px-5 py-3">
              <div>
                <p className="text-text-primary font-medium text-sm">{item.fishName}</p>
                <p className="text-text-secondary text-xs font-mono">{item.quantityKg} kg × {formatPrice(item.priceAudCents)}/kg</p>
              </div>
              <span className="font-mono font-bold text-sunset-gold text-sm">
                {formatPrice(item.priceAudCents * item.quantityKg)}
              </span>
            </li>
          ))}
        </ul>
        <div className="flex items-center justify-between px-5 py-4 border-t border-white/10 bg-white/3">
          <span className="text-text-secondary text-sm">Total incl. delivery</span>
          <span className="font-mono font-bold text-sunset-gold text-xl">{formatPrice(totalCents())}</span>
        </div>
      </div>

      {/* Delivery details */}
      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-white/10">
          <h2 className="text-sm font-mono text-text-secondary uppercase tracking-wider">Delivery Details</h2>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono text-text-secondary uppercase tracking-wider mb-1.5" htmlFor="ck-name">
                Full Name *
              </label>
              <input
                id="ck-name"
                type="text"
                autoComplete="name"
                value={delivery.name}
                onChange={(e) => updateDelivery("name", e.target.value)}
                placeholder="Jane Smith"
                className="admin-input"
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-text-secondary uppercase tracking-wider mb-1.5" htmlFor="ck-phone">
                Phone *
              </label>
              <input
                id="ck-phone"
                type="tel"
                autoComplete="tel"
                value={delivery.phone}
                onChange={(e) => updateDelivery("phone", e.target.value)}
                placeholder="0400 000 000"
                className="admin-input"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-text-secondary uppercase tracking-wider mb-1.5" htmlFor="ck-address">
              Street Address *
            </label>
            <input
              id="ck-address"
              type="text"
              autoComplete="street-address"
              value={delivery.address}
              onChange={(e) => updateDelivery("address", e.target.value)}
              placeholder="123 Main Street"
              className="admin-input"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-mono text-text-secondary uppercase tracking-wider mb-1.5" htmlFor="ck-suburb">
                Suburb *
              </label>
              <input
                id="ck-suburb"
                type="text"
                value={delivery.suburb}
                onChange={(e) => updateDelivery("suburb", e.target.value)}
                placeholder="Wagga Wagga"
                className="admin-input"
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-text-secondary uppercase tracking-wider mb-1.5" htmlFor="ck-postcode">
                Postcode *
              </label>
              <input
                id="ck-postcode"
                type="text"
                inputMode="numeric"
                maxLength={4}
                value={delivery.postcode}
                onChange={(e) => updateDelivery("postcode", e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="2650"
                className="admin-input"
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-text-secondary uppercase tracking-wider mb-1.5" htmlFor="ck-state">
                State
              </label>
              <select id="ck-state" value={delivery.state} onChange={(e) => updateDelivery("state", e.target.value)} className="admin-input">
                {["NSW", "ACT", "VIC", "QLD", "SA", "WA", "TAS", "NT"].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-text-secondary uppercase tracking-wider mb-1.5" htmlFor="ck-notes">
              Delivery Notes (optional)
            </label>
            <textarea
              id="ck-notes"
              rows={2}
              value={delivery.notes}
              onChange={(e) => updateDelivery("notes", e.target.value)}
              placeholder="Leave at front door, call on arrival, etc."
              className="admin-input resize-none"
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-reef-coral/10 border border-reef-coral/30 text-reef-coral text-sm">
          {error}
        </div>
      )}

      <div className="space-y-3">
        <button
          type="button"
          disabled={!isValid || submitting}
          onClick={handleSubmit}
          className="w-full py-4 px-6 rounded-xl bg-ocean-teal text-bg-primary font-bold text-base min-h-[56px] hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {submitting ? "Creating secure checkout…" : `Pay Now — ${formatPrice(totalCents())}`}
        </button>
        <p className="text-xs text-text-secondary text-center font-mono">
          🔒 Secure payment via Stripe · We never store card details
        </p>
        <div className="text-center">
          <Link href="/" className="text-xs text-text-secondary hover:text-text-primary transition-colors">
            ← Back to shop
          </Link>
        </div>
      </div>
    </div>
  );
}
