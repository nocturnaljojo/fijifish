"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { X, ShoppingBag, Plus, Minus, Trash2 } from "lucide-react";
import { useCart } from "@/lib/cart";
import { FLIGHT_CONFIG } from "@/lib/config";
import CountdownTimer from "./CountdownTimer";

function formatPrice(cents: number): string {
  return `A$${(cents / 100).toFixed(2)}`;
}

export default function CartDrawer() {
  const { items, isOpen, closeCart, updateQuantity, removeItem, totalCents } = useCart();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch — cart is localStorage-based
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-[90] bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeCart}
          />

          {/* Drawer */}
          <motion.div
            className="fixed top-0 right-0 bottom-0 z-[91] w-full max-w-sm bg-[#0d1520] border-l border-white/10 flex flex-col shadow-2xl"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <ShoppingBag size={18} className="text-ocean-teal" />
                <h2 className="text-text-primary font-bold">Your Order</h2>
                {items.length > 0 && (
                  <span className="text-xs font-mono text-text-secondary">({items.length} item{items.length !== 1 ? "s" : ""})</span>
                )}
              </div>
              <button
                type="button"
                onClick={closeCart}
                className="p-1.5 rounded-lg hover:bg-white/5 text-text-secondary hover:text-text-primary transition-colors"
                aria-label="Close cart"
              >
                <X size={18} />
              </button>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
                  <span className="text-5xl opacity-20" aria-hidden="true">🐟</span>
                  <p className="text-text-secondary text-sm">Your cart is empty</p>
                  <p className="text-text-secondary text-xs">Browse fresh fish above</p>
                  <button
                    type="button"
                    onClick={closeCart}
                    className="mt-2 text-xs text-ocean-teal hover:underline"
                  >
                    Continue shopping →
                  </button>
                </div>
              ) : (
                <ul className="divide-y divide-white/5">
                  {items.map((item) => {
                    const itemTotal = item.priceAudCents * item.quantityKg;
                    return (
                      <li key={item.fishSpeciesId} className="px-5 py-4 flex flex-col gap-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-text-primary font-semibold text-sm">{item.fishName}</p>
                            <p className="text-text-secondary text-xs font-mono mt-0.5">
                              {formatPrice(item.priceAudCents)}/kg
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeItem(item.fishSpeciesId)}
                            className="p-1.5 rounded text-text-secondary hover:text-reef-coral transition-colors shrink-0"
                            aria-label={`Remove ${item.fishName}`}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>

                        {/* Qty + subtotal row */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.fishSpeciesId, item.quantityKg - 1)}
                              disabled={item.quantityKg <= 1}
                              className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-text-secondary hover:bg-white/10 disabled:opacity-30 transition-colors"
                              aria-label="Decrease quantity"
                            >
                              <Minus size={12} />
                            </button>
                            <span className="w-14 text-center font-mono text-sm text-text-primary">
                              {item.quantityKg} kg
                            </span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.fishSpeciesId, item.quantityKg + 1)}
                              disabled={item.quantityKg >= item.maxAvailableKg}
                              className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-text-secondary hover:bg-white/10 disabled:opacity-30 transition-colors"
                              aria-label="Increase quantity"
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                          <span className="font-mono text-sm font-bold text-sunset-gold">
                            {formatPrice(itemTotal)}
                          </span>
                        </div>
                        {item.quantityKg >= item.maxAvailableKg && (
                          <p className="text-[10px] font-mono text-reef-coral">Max available: {item.maxAvailableKg} kg</p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Footer — totals + CTA */}
            {items.length > 0 && (
              <div className="border-t border-white/10 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-text-secondary text-sm">Subtotal incl. delivery</span>
                  <span className="font-mono font-bold text-sunset-gold text-lg">
                    {formatPrice(totalCents())}
                  </span>
                </div>
                <p className="text-[10px] text-text-secondary font-mono">
                  ✓ Delivery included · Vacuum-sealed fillets · 48hr ocean to door
                </p>
                {/* Delivery date + closing reminder */}
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-text-secondary bg-white/[0.03] border border-white/5 rounded-lg px-3 py-2">
                  <span aria-hidden="true">📦</span>
                  <span>Delivering <span className="text-text-primary font-medium">{FLIGHT_CONFIG.nextDeliveryLabel}</span></span>
                  <span className="opacity-40 mx-0.5">·</span>
                  <span>closes in</span>
                  <CountdownTimer
                    targetTimestamp={FLIGHT_CONFIG.orderCloseAt}
                    className="text-[10px] font-bold"
                    baseColor="text-reef-coral"
                    urgentColor="text-reef-coral"
                  />
                </div>
                <Link
                  href="/checkout"
                  onClick={closeCart}
                  className="flex items-center justify-center w-full py-3.5 px-4 rounded-xl bg-ocean-teal text-bg-primary font-bold text-base min-h-[52px] hover:opacity-90 active:scale-[0.98] transition-all"
                >
                  Checkout — {formatPrice(totalCents())}
                </Link>
                <p className="text-[10px] text-text-secondary font-mono text-center opacity-60">
                  🔒 Secured by Stripe
                </p>
                <button
                  type="button"
                  onClick={closeCart}
                  className="w-full text-center text-xs text-text-secondary hover:text-text-primary transition-colors py-1"
                >
                  Continue shopping
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
