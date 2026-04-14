"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import CapacityBar from "./CapacityBar";
import CountdownTimer from "./CountdownTimer";
import { FLIGHT_CONFIG, THRESHOLDS } from "@/lib/config";
import { useCart } from "@/lib/cart";
import { useFlightWindow } from "@/hooks/useFlightWindow";
import type { FlightWindowStatus } from "@/types/database";

export interface FishCardData {
  id: string;
  name_fijian: string | null;
  name_english: string;
  name_scientific: string | null;
  cooking_suggestions: string | null;
  price_aud_cents: number;
  available_kg: number;
  total_kg: number;
  village_name?: string;
}

function formatPrice(cents: number): string {
  const dollars = cents / 100;
  return `A$${dollars % 1 === 0 ? dollars : dollars.toFixed(2)}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "Australia/Sydney",
  });
}

/** Returns the button label/state when ordering is not available. */
function closedButtonLabel(status: FlightWindowStatus, orderOpenAt: string | null): string {
  if (status === "upcoming" && orderOpenAt) {
    return `Orders open ${formatDate(orderOpenAt)}`;
  }
  if (status === "cancelled") return "Window cancelled";
  if (["packing", "shipped", "in_transit", "landed", "customs", "delivering", "delivered"].includes(status)) {
    return "Order window closed";
  }
  return "Orders closed";
}

// ── Hero Card (Walu) ─────────────────────────────────────────────────────────

function HeroFishCard({
  fish,
  orderCloseAt,
  windowStatus,
  orderOpenAt,
}: {
  fish: FishCardData;
  orderCloseAt: number;
  windowStatus: FlightWindowStatus;
  orderOpenAt: string | null;
}) {
  const isSoldOut = fish.available_kg <= 0;
  const canOrder = (windowStatus === "open" || windowStatus === "closing_soon") && !isSoldOut;
  const { addItem, openCart, items } = useCart();
  const [justAdded, setJustAdded] = useState(false);
  const inCart = items.some((i) => i.fishSpeciesId === fish.id);

  function handleAddToCart() {
    addItem({
      fishSpeciesId: fish.id,
      fishName: fish.name_fijian ?? fish.name_english,
      priceAudCents: fish.price_aud_cents,
      maxAvailableKg: Math.floor(fish.available_kg),
    });
    setJustAdded(true);
    openCart();
    setTimeout(() => setJustAdded(false), 2000);
  }

  return (
    <article className="relative md:col-span-2 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden">
      {/* 🔥 MOST POPULAR badge */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-reef-coral/15 border border-reef-coral/30 text-reef-coral text-[10px] font-mono tracking-widest uppercase">
        🔥 Most Popular
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2">
        {/* Image placeholder — premium gradient */}
        <div
          className="relative aspect-video sm:aspect-auto sm:min-h-[280px] overflow-hidden"
          style={{ background: "linear-gradient(135deg, #0d1520 0%, #0a1628 50%, #071018 100%)" }}
        >
          <div
            className="absolute inset-0"
            aria-hidden="true"
            style={{
              background:
                "radial-gradient(ellipse at 30% 30%, rgba(79,195,247,0.12) 0%, transparent 55%), " +
                "radial-gradient(ellipse at 75% 70%, rgba(255,171,64,0.07) 0%, transparent 50%)",
            }}
          />
          <div
            className="absolute inset-0 flex items-center justify-center select-none pointer-events-none"
            aria-hidden="true"
          >
            <span className="text-8xl font-black text-white/[0.04] tracking-widest">WALU</span>
          </div>
          <svg
            className="absolute inset-0 w-full h-full opacity-[0.03]"
            viewBox="0 0 200 120"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M20 60 C40 30, 80 20, 120 30 C140 35, 160 45, 175 60 C160 75, 140 85, 120 90 C80 100, 40 90, 20 60 Z M175 60 L190 45 L195 60 L190 75 Z"
              fill="white"
            />
            <circle cx="130" cy="52" r="3" fill="white" />
          </svg>
          {isSoldOut && (
            <div className="absolute inset-0 bg-bg-primary/75 flex items-center justify-center z-10">
              <span className="font-mono font-bold text-reef-coral tracking-widest text-base uppercase border border-reef-coral/40 px-4 py-2 rounded-lg">
                Sold Out
              </span>
            </div>
          )}
          <div className="absolute bottom-4 left-0 right-0 flex justify-center">
            <span className="text-xs font-mono text-white/20 tracking-widest uppercase">
              First catch photo arriving soon
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-col p-6 sm:p-8 gap-4">
          <div>
            <h3 className="text-2xl sm:text-3xl font-bold text-text-primary leading-snug">Walu</h3>
            <p className="text-sm text-text-secondary mt-0.5">
              Spanish Mackerel
              {fish.name_scientific && (
                <>
                  {" · "}
                  <em className="text-xs opacity-60">{fish.name_scientific}</em>
                </>
              )}
            </p>
            <p className="text-xs text-text-secondary mt-1.5">Caught in Bua Province, Fiji&nbsp;🇫🇯</p>
          </div>

          <div>
            <div className="flex items-baseline gap-2">
              <span
                className="font-mono font-bold text-sunset-gold"
                style={{ fontSize: "3rem", lineHeight: 1 }}
              >
                {formatPrice(fish.price_aud_cents)}
              </span>
              <span className="text-sm font-mono text-text-secondary">/kg</span>
            </div>
            <p className="text-xs font-mono text-lagoon-green mt-1 tracking-wide uppercase">
              ✓ Delivery included — no hidden fees
            </p>
          </div>

          <CapacityBar availableKg={fish.available_kg} totalKg={fish.total_kg} />

          {!isSoldOut && fish.available_kg > 0 && fish.available_kg <= 5 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wide bg-reef-coral/10 border border-reef-coral/25 text-reef-coral w-fit">
              Only {Math.round(fish.available_kg)}kg left!
            </span>
          )}

          {/* Mini countdown — only show when ordering is active */}
          {(windowStatus === "open" || windowStatus === "closing_soon") && (
            <div className="flex items-center gap-2 text-xs font-mono text-text-secondary">
              <span
                className="w-1.5 h-1.5 rounded-full bg-reef-coral animate-pulse shrink-0"
                aria-hidden="true"
              />
              <span>Order closes in</span>
              <CountdownTimer
                targetTimestamp={orderCloseAt}
                className="font-bold text-xs"
                baseColor="text-reef-coral"
                urgentColor="text-reef-coral"
              />
            </div>
          )}

          <p className="text-sm text-text-secondary leading-relaxed">
            {fish.cooking_suggestions ??
              "Firm, white flesh perfect for kokoda, curry, or pan-frying. Caught to order — never frozen."}
          </p>

          <div className="mt-auto space-y-2">
            <button
              type="button"
              disabled={!canOrder}
              onClick={canOrder ? handleAddToCart : undefined}
              className={`w-full py-3.5 px-4 rounded-xl font-bold text-base min-h-[56px] transition-all ${
                !canOrder
                  ? "bg-bg-tertiary text-text-secondary cursor-not-allowed border border-border-default"
                  : justAdded
                  ? "bg-lagoon-green text-bg-primary"
                  : inCart
                  ? "bg-ocean-teal/80 text-bg-primary hover:opacity-90"
                  : "bg-ocean-teal text-bg-primary hover:opacity-90 active:scale-[0.98]"
              }`}
            >
              {!canOrder
                ? isSoldOut
                  ? "Sold Out"
                  : closedButtonLabel(windowStatus, orderOpenAt)
                : justAdded
                ? "✅ Added to cart!"
                : inCart
                ? "In Cart — Add Another kg"
                : `Secure Your Order — ${formatPrice(fish.price_aud_cents)}/kg`}
            </button>
            {canOrder && (
              <p className="text-xs text-text-secondary text-center font-mono">
                🛩️ Limited cargo space · ⏰ Catch window closing soon
              </p>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

// ── Standard Card ────────────────────────────────────────────────────────────

export default function FishCard({
  fish,
  isHero = false,
  index = 0,
  orderCloseAt,
}: {
  fish: FishCardData;
  isHero?: boolean;
  index?: number;
  orderCloseAt?: number;
}) {
  const closeAt = orderCloseAt ?? FLIGHT_CONFIG.orderCloseAt;

  // Hooks must be called unconditionally before any early returns
  const { addItem, openCart, items } = useCart();
  const { status: windowStatus, currentWindow } = useFlightWindow();
  const [justAdded, setJustAdded] = useState(false);

  const isSoldOut = fish.available_kg <= 0;
  const canOrder = (windowStatus === "open" || windowStatus === "closing_soon") && !isSoldOut;
  const displayName = fish.name_fijian ?? fish.name_english;
  const subName = fish.name_fijian ? fish.name_english : null;
  const inCart = items.some((i) => i.fishSpeciesId === fish.id);
  const orderOpenAt = currentWindow?.order_open_at ?? null;

  if (isHero) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="md:col-span-2 lg:col-span-2"
      >
        <HeroFishCard
          fish={fish}
          orderCloseAt={closeAt}
          windowStatus={windowStatus}
          orderOpenAt={orderOpenAt}
        />
      </motion.div>
    );
  }

  function handleAddToCart() {
    addItem({
      fishSpeciesId: fish.id,
      fishName: displayName,
      priceAudCents: fish.price_aud_cents,
      maxAvailableKg: Math.floor(fish.available_kg),
    });
    setJustAdded(true);
    openCart();
    setTimeout(() => setJustAdded(false), 2000);
  }

  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.08, ease: "easeOut" }}
      className="flex flex-col bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden"
    >
      {/* Image — premium gradient placeholder */}
      <div
        className="relative w-full aspect-video overflow-hidden"
        style={{ background: "linear-gradient(135deg, #0d1520 0%, #0a1628 50%, #071018 100%)" }}
      >
        <div
          className="absolute inset-0"
          aria-hidden="true"
          style={{
            background:
              "radial-gradient(ellipse at 35% 35%, rgba(79,195,247,0.07) 0%, transparent 55%), " +
              "radial-gradient(ellipse at 70% 65%, rgba(102,187,106,0.05) 0%, transparent 50%)",
          }}
        />
        <div
          className="absolute inset-0 flex items-center justify-center select-none pointer-events-none"
          aria-hidden="true"
        >
          <span className="text-5xl font-black text-white/[0.04] tracking-widest uppercase">
            {displayName}
          </span>
        </div>
        {isSoldOut && (
          <div className="absolute inset-0 bg-bg-primary/75 flex items-center justify-center">
            <span className="font-mono font-bold text-reef-coral tracking-widest text-base uppercase border border-reef-coral/40 px-4 py-2 rounded-lg">
              Sold Out
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-5 gap-3">
        <div>
          <h3 className="text-xl font-bold text-text-primary leading-snug">{displayName}</h3>
          {(subName ?? fish.name_scientific) && (
            <p className="text-sm text-text-secondary mt-0.5">
              {subName && <span>{subName}</span>}
              {subName && fish.name_scientific && <span className="opacity-50"> · </span>}
              {fish.name_scientific && <em className="text-xs opacity-70">{fish.name_scientific}</em>}
            </p>
          )}
        </div>

        <div>
          <div
            className="font-mono text-2xl font-bold text-sunset-gold"
            aria-label={`Price: ${formatPrice(fish.price_aud_cents)}/kg`}
          >
            {formatPrice(fish.price_aud_cents)}
            <span className="text-sm font-normal text-text-secondary">/kg</span>
          </div>
          <p className="text-[10px] font-mono text-lagoon-green mt-0.5 uppercase tracking-wide">
            ✓ Delivery included
          </p>
        </div>

        <CapacityBar availableKg={fish.available_kg} totalKg={fish.total_kg} />

        {!isSoldOut && fish.available_kg > 0 && fish.available_kg <= 5 && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wide bg-reef-coral/10 border border-reef-coral/25 text-reef-coral w-fit">
            Only {Math.round(fish.available_kg)}kg left!
          </span>
        )}

        {/* Mini countdown — only when ordering is active */}
        {(windowStatus === "open" || windowStatus === "closing_soon") && (
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-text-secondary">
            <span
              className="w-1.5 h-1.5 rounded-full bg-reef-coral animate-pulse shrink-0"
              aria-hidden="true"
            />
            <CountdownTimer
              targetTimestamp={closeAt}
              className="font-bold text-[10px]"
              baseColor="text-reef-coral"
              urgentColor="text-reef-coral"
            />
            <span>left to order</span>
          </div>
        )}

        <div className="mt-auto pt-1">
          {isSoldOut ? (
            <div className="space-y-2">
              <button
                type="button"
                disabled
                className="w-full py-3 px-4 rounded-lg font-semibold text-sm min-h-[48px] bg-bg-tertiary text-text-secondary cursor-not-allowed border border-border-default"
              >
                Sold Out
              </button>
              <button
                type="button"
                className="w-full py-2 px-4 rounded-lg font-medium text-xs min-h-[36px] border border-ocean-teal/30 text-ocean-teal hover:bg-ocean-teal/5 transition-colors"
              >
                Notify me next flight
              </button>
            </div>
          ) : canOrder ? (
            <div className="space-y-1.5">
              <button
                type="button"
                onClick={handleAddToCart}
                className={`w-full py-3 px-4 rounded-lg font-semibold text-sm min-h-[48px] transition-all ${
                  justAdded
                    ? "bg-lagoon-green text-bg-primary"
                    : inCart
                    ? "bg-ocean-teal/80 text-bg-primary hover:opacity-90"
                    : "bg-ocean-teal text-bg-primary hover:opacity-90 active:scale-[0.98]"
                }`}
              >
                {justAdded ? "✅ Added!" : inCart ? "In Cart — Add Another" : "Order Now"}
              </button>
              {fish.available_kg < fish.total_kg * (THRESHOLDS.cargoFillingFast / 100) && (
                <p className="text-xs text-text-secondary text-center font-mono">
                  Limited cargo space remaining
                </p>
              )}
            </div>
          ) : (
            <button
              type="button"
              disabled
              className="w-full py-3 px-4 rounded-lg font-semibold text-sm min-h-[48px] bg-bg-tertiary text-text-secondary cursor-not-allowed border border-border-default"
            >
              {closedButtonLabel(windowStatus, orderOpenAt)}
            </button>
          )}
        </div>
      </div>
    </motion.article>
  );
}
