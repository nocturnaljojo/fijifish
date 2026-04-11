"use client";

import { motion } from "framer-motion";
import CapacityBar from "./CapacityBar";
import CountdownTimer from "./CountdownTimer";
import { FLIGHT_CONFIG, THRESHOLDS } from "@/lib/config";

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

// ── Hero Card (Walu) ─────────────────────────────────────────────────────────

function HeroFishCard({ fish, orderCloseAt }: { fish: FishCardData; orderCloseAt: number }) {
  const isSoldOut = fish.available_kg <= 0;

  return (
    <article className="relative md:col-span-2 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden">
      {/* 🔥 MOST POPULAR badge */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-reef-coral/15 border border-reef-coral/30 text-reef-coral text-[10px] font-mono tracking-widest uppercase">
        🔥 Most Popular
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2">
        {/* Image placeholder */}
        <div className="relative aspect-video sm:aspect-auto sm:min-h-[280px] bg-bg-tertiary flex items-center justify-center overflow-hidden">
          <div
            className="absolute inset-0"
            aria-hidden="true"
            style={{
              background:
                "radial-gradient(ellipse at 40% 40%, rgba(79,195,247,0.1) 0%, transparent 60%), " +
                "radial-gradient(ellipse at 70% 70%, rgba(255,171,64,0.06) 0%, transparent 50%)",
            }}
          />
          {isSoldOut && (
            <div className="absolute inset-0 bg-bg-primary/75 flex items-center justify-center z-10">
              <span className="font-mono font-bold text-reef-coral tracking-widest text-base uppercase border border-reef-coral/40 px-4 py-2 rounded-lg">
                Sold Out
              </span>
            </div>
          )}
          <div className="relative flex flex-col items-center gap-2 text-text-secondary select-none">
            <span className="text-7xl opacity-25" aria-hidden="true">🐟</span>
            <span className="text-xs font-mono opacity-25 tracking-widest uppercase">Photo coming soon</span>
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-col p-6 sm:p-8 gap-4">
          <div>
            <h3 className="text-2xl sm:text-3xl font-bold text-text-primary leading-snug">
              Walu
            </h3>
            <p className="text-sm text-text-secondary mt-0.5">
              Spanish Mackerel
              {fish.name_scientific && (
                <> · <em className="text-xs opacity-60">{fish.name_scientific}</em></>
              )}
            </p>
            <p className="text-xs text-text-secondary mt-1.5">
              Caught in Bua Province, Fiji&nbsp;🇫🇯
            </p>
          </div>

          {/* Price — 48px bold */}
          <div>
            <div className="flex items-baseline gap-2">
              <span className="font-mono font-bold text-sunset-gold" style={{ fontSize: "3rem", lineHeight: 1 }}>
                {formatPrice(fish.price_aud_cents)}
              </span>
              <span className="text-sm font-mono text-text-secondary">/kg</span>
            </div>
            <p className="text-xs font-mono text-lagoon-green mt-1 tracking-wide uppercase">
              ✓ Delivery included — no hidden fees
            </p>
          </div>

          <CapacityBar availableKg={fish.available_kg} totalKg={fish.total_kg} />

          {/* Mini countdown */}
          <div className="flex items-center gap-2 text-xs font-mono text-text-secondary">
            <span className="w-1.5 h-1.5 rounded-full bg-reef-coral animate-pulse shrink-0" aria-hidden="true" />
            <span>Order closes in</span>
            <CountdownTimer
              targetTimestamp={orderCloseAt}
              className="font-bold text-xs"
              baseColor="text-reef-coral"
              urgentColor="text-reef-coral"
            />
          </div>

          <p className="text-sm text-text-secondary leading-relaxed">
            {fish.cooking_suggestions ??
              "Firm, white flesh perfect for kokoda, curry, or pan-frying. Caught to order — never frozen."}
          </p>

          <div className="mt-auto space-y-2">
            <button
              type="button"
              disabled={isSoldOut}
              className={`w-full py-3.5 px-4 rounded-xl font-bold text-base min-h-[56px] transition-all ${
                isSoldOut
                  ? "bg-bg-tertiary text-text-secondary cursor-not-allowed border border-border-default"
                  : "bg-ocean-teal text-bg-primary hover:opacity-90 active:scale-[0.98]"
              }`}
            >
              {isSoldOut ? "Sold Out" : "Secure Your Order — A$35/kg"}
            </button>
            {!isSoldOut && (
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

  if (isHero) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="md:col-span-2 lg:col-span-2"
      >
        <HeroFishCard fish={fish} orderCloseAt={closeAt} />
      </motion.div>
    );
  }

  const isSoldOut = fish.available_kg <= 0;
  const displayName = fish.name_fijian ?? fish.name_english;
  const subName = fish.name_fijian ? fish.name_english : null;

  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.08, ease: "easeOut" }}
      className="flex flex-col bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden"
    >
      {/* Image */}
      <div className="relative w-full aspect-video bg-bg-tertiary flex items-center justify-center overflow-hidden">
        <div
          className="absolute inset-0"
          aria-hidden="true"
          style={{
            background:
              "radial-gradient(ellipse at 40% 40%, rgba(79,195,247,0.06) 0%, transparent 60%), " +
              "radial-gradient(ellipse at 70% 70%, rgba(102,187,106,0.04) 0%, transparent 50%)",
          }}
        />
        <div className="relative flex flex-col items-center gap-2 text-text-secondary select-none">
          <span className="text-5xl opacity-30" aria-hidden="true">🐟</span>
          <span className="text-xs font-mono opacity-30 tracking-widest uppercase">Photo coming soon</span>
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
          <div className="font-mono text-2xl font-bold text-sunset-gold" aria-label={`Price: ${formatPrice(fish.price_aud_cents)}/kg`}>
            {formatPrice(fish.price_aud_cents)}<span className="text-sm font-normal text-text-secondary">/kg</span>
          </div>
          <p className="text-[10px] font-mono text-lagoon-green mt-0.5 uppercase tracking-wide">
            ✓ Delivery included
          </p>
        </div>

        <CapacityBar availableKg={fish.available_kg} totalKg={fish.total_kg} />

        {/* Mini countdown */}
        <div className="flex items-center gap-1.5 text-[10px] font-mono text-text-secondary">
          <span className="w-1.5 h-1.5 rounded-full bg-reef-coral animate-pulse shrink-0" aria-hidden="true" />
          <CountdownTimer
            targetTimestamp={closeAt}
            className="font-bold text-[10px]"
            baseColor="text-reef-coral"
            urgentColor="text-reef-coral"
          />
          <span>left to order</span>
        </div>

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
          ) : (
            <div className="space-y-1.5">
              <button
                type="button"
                className="w-full py-3 px-4 rounded-lg font-semibold text-sm min-h-[48px] bg-ocean-teal text-bg-primary hover:opacity-90 active:scale-[0.98] transition-all"
              >
                Order Now
              </button>
              {fish.available_kg < fish.total_kg * (THRESHOLDS.cargoFillingFast / 100) && (
                <p className="text-xs text-text-secondary text-center font-mono">
                  Limited cargo space remaining
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.article>
  );
}
