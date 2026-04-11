"use client";

import { useEffect, useState } from "react";
import { CARGO_CONFIG, THRESHOLDS } from "@/lib/config";

interface StickyOrderBarProps {
  cargoPercent?: number;
}

export default function StickyOrderBar({ cargoPercent }: StickyOrderBarProps = {}) {
  const CARGO_PCT = cargoPercent ?? CARGO_CONFIG.capacityPercent;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > 500);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const ctaLabel =
    CARGO_PCT >= THRESHOLDS.cargoAlmostFull ? "Order Now — Almost Full!" : "Order Before Window Closes";

  return (
    <div
      className={`md:hidden fixed bottom-0 left-0 right-0 z-40 transition-transform duration-300 ${
        visible ? "translate-y-0" : "translate-y-full"
      }`}
      aria-hidden={!visible}
    >
      <div
        className="flex items-center justify-between gap-3 px-4 py-3 border-t border-white/10 backdrop-blur-md"
        style={{ background: "rgba(10,15,26,0.97)" }}
      >
        <div>
          <p className="text-[10px] font-mono text-text-secondary uppercase tracking-wider leading-none mb-0.5">
            🐟 Wild-caught Walu
          </p>
          <p className="font-mono font-bold text-sunset-gold text-base leading-none">
            A$35<span className="text-xs font-normal text-text-secondary">/kg delivered</span>
          </p>
        </div>
        <a
          href="#fish-grid"
          className="shrink-0 inline-flex items-center justify-center px-4 py-3 rounded-xl bg-ocean-teal text-bg-primary font-bold text-sm min-h-[48px] hover:opacity-90 active:scale-[0.98] transition-all"
        >
          {ctaLabel}
        </a>
      </div>
    </div>
  );
}
