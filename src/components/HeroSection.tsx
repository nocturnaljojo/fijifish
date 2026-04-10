"use client";

import { motion, type Transition } from "framer-motion";

function fadeUp(delay = 0): {
  initial: { opacity: number; y: number };
  animate: { opacity: number; y: number };
  transition: Transition;
} {
  return {
    initial: { opacity: 0, y: 24 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, delay, ease: "easeOut" },
  };
}

const BADGES = [
  { icon: "✈️", label: "AIR-FREIGHTED FIJI AIRWAYS" },
  { icon: "🐟", label: "CAUGHT TO DOOR IN 48HRS" },
  { icon: "🚚", label: "RIVERINA NSW DELIVERY" },
];

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden pt-14 pb-20 px-4 sm:pt-20 sm:pb-28">
      {/* Ocean-teal radial glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(ellipse 90% 55% at 50% -5%, rgba(79,195,247,0.13) 0%, transparent 65%), " +
            "radial-gradient(ellipse 50% 35% at 85% 75%, rgba(102,187,106,0.06) 0%, transparent 55%)",
        }}
      />

      <div className="relative max-w-4xl mx-auto text-center">
        {/* Live status badge */}
        <motion.div
          {...fadeUp(0)}
          className="inline-flex items-center gap-2 px-3 py-1 mb-8 rounded-full border border-ocean-teal/25 bg-ocean-teal/5 text-ocean-teal text-xs font-mono tracking-widest uppercase"
        >
          <span
            className="w-1.5 h-1.5 rounded-full bg-lagoon-green animate-pulse inline-block"
            aria-hidden="true"
          />
          Live — Orders open now
        </motion.div>

        {/* Headline */}
        <motion.h1
          {...fadeUp(0.1)}
          className="text-4xl sm:text-6xl lg:text-7xl font-bold text-text-primary leading-tight tracking-tight mb-5"
        >
          Fresh Walu.
          <br />
          <span
            className="text-transparent bg-clip-text"
            style={{
              backgroundImage: "linear-gradient(135deg, #4fc3f7 0%, #29b6f6 50%, #81d4fa 100%)",
            }}
          >
            A$35/kg Delivered.
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          {...fadeUp(0.25)}
          className="max-w-2xl mx-auto text-base sm:text-lg text-text-secondary leading-relaxed mb-10"
        >
          Wild-caught Spanish Mackerel (Walu) from Bua Province. Vacuum-sealed
          1&nbsp;kg fillets. No hidden fees — delivery to your door in the Riverina
          is included.
        </motion.p>

        {/* CTAs */}
        <motion.div
          {...fadeUp(0.4)}
          className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4"
        >
          {/* Primary CTA */}
          <a
            href="#fish-grid"
            className="relative group inline-flex flex-col items-center justify-center px-10 py-3.5 rounded-xl bg-ocean-teal text-bg-primary font-bold min-h-[64px] overflow-hidden w-full sm:w-auto transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{ minWidth: "220px" }}
          >
            {/* shimmer */}
            <span
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.25) 50%, transparent 70%)",
                animation: "heroShimmer 3s ease-in-out infinite",
              }}
              aria-hidden="true"
            />
            <span className="relative text-[10px] font-mono tracking-[0.2em] uppercase opacity-70 mb-0.5">
              ORDER NOW
            </span>
            <span className="relative text-lg font-bold">
              Order Walu — A$35/kg
            </span>
          </a>

          {/* Secondary CTA */}
          <a
            href="#village"
            className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl border border-white/10 text-text-secondary font-medium text-base min-h-[56px] hover:border-ocean-teal/40 hover:text-text-primary transition-all w-full sm:w-auto backdrop-blur-sm bg-white/5"
          >
            See How We Support Fiji
          </a>
        </motion.div>

        {/* Trust badges */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-12 pt-8 border-t border-white/5 flex flex-wrap items-center justify-center gap-x-6 gap-y-3"
        >
          {BADGES.map((b) => (
            <span
              key={b.label}
              className="flex items-center gap-2 text-[10px] font-mono text-text-secondary tracking-[0.15em] uppercase"
            >
              <span aria-hidden="true">{b.icon}</span>
              {b.label}
            </span>
          ))}
        </motion.div>
      </div>

      <style>{`
        @keyframes heroShimmer {
          0%   { transform: translateX(-100%); }
          55%  { transform: translateX(100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </section>
  );
}
