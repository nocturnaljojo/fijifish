"use client";

import { useEffect, useRef, useState } from "react";

// ── Step definitions ──────────────────────────────────────────────────────────

const STEPS = [
  {
    number: "01",
    tag: "You Commit",
    headline: ["Pre-Order Before", "Tuesday Night"],
    body: "We only catch what's been ordered — no freezing, no waste. The window closes Tuesday 11:59PM AEST. After that, the order goes straight to the fishermen.",
    detail: "⏱ Window closes Tuesday 11:59PM AEST",
    detailColor: "text-ocean-teal",
    accentColor: "#4fc3f7",
    icon: (
      <svg viewBox="0 0 48 48" fill="none" className="w-12 h-12" aria-hidden="true">
        <rect x="8" y="10" width="32" height="34" rx="4" stroke="#4fc3f7" strokeWidth="2" strokeOpacity="0.6"/>
        <path d="M16 10V6M32 10V6" stroke="#4fc3f7" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.6"/>
        <path d="M8 20h32" stroke="#4fc3f7" strokeWidth="1.5" strokeOpacity="0.4"/>
        <path d="M16 30l4 4 8-10" stroke="#66bb6a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    number: "02",
    tag: "We Catch",
    headline: ["Fishermen Cast Nets", "at Dawn"],
    body: "The fishermen of Galoa Village, Bua go out specifically for your order. Wild-caught from the pristine reefs of Vanua Levu. Reef-to-ice in under 4 hours.",
    detail: "📍 Galoa Village, Bua, Vanua Levu 🇫🇯",
    detailColor: "text-lagoon-green",
    accentColor: "#66bb6a",
    icon: (
      <svg viewBox="0 0 48 48" fill="none" className="w-12 h-12" aria-hidden="true">
        <path d="M6 32 C10 22, 18 18, 24 20 C30 22, 38 18, 42 28" stroke="#66bb6a" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.5"/>
        <path d="M6 36 C10 26, 18 22, 24 24 C30 26, 38 22, 42 32" stroke="#66bb6a" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.3"/>
        <ellipse cx="24" cy="22" rx="7" ry="4.5" stroke="#4fc3f7" strokeWidth="1.8" strokeOpacity="0.7" transform="rotate(-10 24 22)"/>
        <circle cx="18" cy="21" r="1.5" fill="#4fc3f7" opacity="0.7"/>
        <path d="M31 16 L34 10 M34 10 L30 11 M34 10 L35 14" stroke="#ffab40" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.7"/>
      </svg>
    ),
  },
  {
    number: "03",
    tag: "Thursday Delivery",
    headline: ["Fresh Walu on", "Your Doorstep"],
    body: "FJ911 departs Nadi Thursday morning. Cleared through Sydney customs. Your vacuum-sealed Walu is at your Riverina door by Thursday afternoon — ready for dinner.",
    detail: "✈ FJ911 Nadi → Sydney → Riverina",
    detailColor: "text-sunset-gold",
    accentColor: "#ffab40",
    cta: true,
    icon: (
      <svg viewBox="0 0 48 48" fill="none" className="w-12 h-12" aria-hidden="true">
        <path d="M8 38 L16 30 L24 34 L38 16" stroke="#ffab40" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.7"/>
        <circle cx="38" cy="16" r="3.5" fill="#ffab40" fillOpacity="0.25" stroke="#ffab40" strokeWidth="1.5"/>
        <path d="M20 42 h8 M24 42 v-4" stroke="#ffab40" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.5"/>
        <path d="M8 24 C12 20 18 18 24 20" stroke="#4fc3f7" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.4" strokeDasharray="3 2"/>
      </svg>
    ),
  },
] as const;

// ── Component ─────────────────────────────────────────────────────────────────

export default function ReefToTable() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [stepProgress, setStepProgress] = useState(0); // 0-1 within current step

  useEffect(() => {
    const handleScroll = () => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const totalScrollable = el.offsetHeight - window.innerHeight;
      if (totalScrollable <= 0) return;
      const scrolled = -rect.top;
      const p = Math.min(1, Math.max(0, scrolled / totalScrollable));

      const step = Math.min(2, Math.floor(p * 3));
      const sp = (p * 3) - step; // 0-1 within current step
      setActiveStep(step);
      setStepProgress(sp);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative"
      style={{ height: "300vh" }}
      aria-label="How FijiFish works — 3 steps"
    >
      {/* Sticky viewport */}
      <div className="sticky top-0 h-screen overflow-hidden flex flex-col items-center justify-center bg-bg-primary">

        {/* Subtle radial glow that shifts colour per step */}
        <div
          className="absolute inset-0 pointer-events-none transition-all duration-700"
          style={{
            background: `radial-gradient(ellipse 70% 60% at 50% 40%, ${STEPS[activeStep].accentColor}0d 0%, transparent 65%)`,
          }}
          aria-hidden="true"
        />

        {/* Tactical grid */}
        <div
          className="absolute inset-0 pointer-events-none"
          aria-hidden="true"
          style={{
            backgroundImage:
              "linear-gradient(rgba(79,195,247,1) 1px, transparent 1px), linear-gradient(90deg, rgba(79,195,247,1) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
            opacity: 0.018,
          }}
        />

        {/* Top progress bar */}
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-border-default">
          <div
            className="h-full transition-all duration-150"
            style={{
              width: `${((activeStep + stepProgress) / 3) * 100}%`,
              backgroundColor: STEPS[activeStep].accentColor,
            }}
          />
        </div>

        {/* Step cards */}
        <div className="relative w-full max-w-2xl mx-auto px-6 flex items-center justify-center">
          {STEPS.map((step, i) => {
            const isActive = i === activeStep;
            const isPast = i < activeStep;

            return (
              <div
                key={i}
                className="absolute inset-x-6 flex flex-col items-center text-center"
                style={{
                  opacity: isActive ? 1 : 0,
                  transform: isActive
                    ? "translateY(0) scale(1)"
                    : isPast
                    ? "translateY(-48px) scale(0.97)"
                    : "translateY(48px) scale(0.97)",
                  transition: "opacity 0.55s cubic-bezier(0.4,0,0.2,1), transform 0.55s cubic-bezier(0.4,0,0.2,1)",
                  pointerEvents: isActive ? "auto" : "none",
                }}
                aria-hidden={!isActive}
              >
                {/* Faint large step number in background */}
                <span
                  className="absolute -top-8 sm:-top-12 font-bold font-mono select-none pointer-events-none"
                  style={{
                    fontSize: "clamp(6rem, 20vw, 14rem)",
                    lineHeight: 1,
                    color: step.accentColor,
                    opacity: 0.04,
                  }}
                  aria-hidden="true"
                >
                  {step.number}
                </span>

                {/* Tag + icon */}
                <div className="relative flex flex-col items-center gap-3 mb-6">
                  <div
                    className="inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-mono tracking-widest uppercase"
                    style={{
                      borderColor: `${step.accentColor}33`,
                      backgroundColor: `${step.accentColor}0d`,
                      color: step.accentColor,
                    }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full inline-block"
                      style={{ backgroundColor: step.accentColor }}
                    />
                    Step {step.number} — {step.tag}
                  </div>

                  <div
                    className="p-3 rounded-2xl border"
                    style={{
                      borderColor: `${step.accentColor}22`,
                      backgroundColor: `${step.accentColor}0a`,
                    }}
                  >
                    {step.icon}
                  </div>
                </div>

                {/* Headline */}
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-text-primary leading-tight tracking-tight mb-4">
                  {step.headline[0]}
                  <br />
                  <span style={{ color: step.accentColor }}>{step.headline[1]}</span>
                </h2>

                {/* Body */}
                <p className="text-text-secondary text-base sm:text-lg leading-relaxed max-w-lg mb-6">
                  {step.body}
                </p>

                {/* Detail line */}
                <p className={`text-sm font-mono ${step.detailColor} mb-8`}>
                  {step.detail}
                </p>

                {/* CTA on final step */}
                {"cta" in step && step.cta && (
                  <a
                    href="#fish-grid"
                    className="group relative inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-base overflow-hidden"
                    style={{
                      backgroundColor: "#ffab40",
                      color: "#0a0f1a",
                      minHeight: "56px",
                    }}
                  >
                    {/* Shimmer */}
                    <span
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        background:
                          "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.35) 50%, transparent 70%)",
                        animation: "ctaShimmer 2.8s ease-in-out infinite",
                      }}
                      aria-hidden="true"
                    />
                    <span className="relative">Order Walu — A$35/kg</span>
                    <span
                      className="relative transition-transform duration-200 group-hover:translate-x-1"
                      aria-hidden="true"
                    >
                      →
                    </span>
                    <style>{`
                      @keyframes ctaShimmer {
                        0%   { transform: translateX(-100%); }
                        60%  { transform: translateX(100%); }
                        100% { transform: translateX(100%); }
                      }
                    `}</style>
                  </a>
                )}
              </div>
            );
          })}
        </div>

        {/* Step dots + connector */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-3">
          {STEPS.map((step, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="flex flex-col items-center gap-1">
                <div
                  className="rounded-full transition-all duration-400"
                  style={{
                    width: i === activeStep ? "28px" : "8px",
                    height: "8px",
                    backgroundColor: i <= activeStep ? step.accentColor : "#1e2a3a",
                    opacity: i < activeStep ? 0.4 : 1,
                  }}
                />
                <span
                  className="text-[10px] font-mono transition-all duration-300"
                  style={{
                    color: i === activeStep ? step.accentColor : "#546e7a",
                    opacity: i === activeStep ? 1 : 0.5,
                  }}
                >
                  {step.tag}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className="mb-4 h-px w-8 transition-all duration-500"
                  style={{
                    backgroundColor:
                      i < activeStep ? STEPS[i].accentColor : "#1e2a3a",
                    opacity: 0.5,
                  }}
                />
              )}
            </div>
          ))}
        </div>

        {/* Scroll nudge — only on step 0 */}
        <div
          className="absolute bottom-24 right-6 sm:right-10 flex flex-col items-center gap-1 transition-opacity duration-500"
          style={{ opacity: activeStep === 0 ? 0.4 : 0 }}
          aria-hidden="true"
        >
          <span className="text-[10px] font-mono text-text-secondary uppercase tracking-widest">
            Scroll
          </span>
          <svg width="16" height="24" viewBox="0 0 16 24" fill="none">
            <rect x="1" y="1" width="14" height="22" rx="7" stroke="#4fc3f7" strokeWidth="1.2" opacity="0.4"/>
            <circle cx="8" cy="8" r="2.5" fill="#4fc3f7" opacity="0.6">
              <animate attributeName="cy" values="8;14;8" dur="1.6s" repeatCount="indefinite"/>
              <animate attributeName="opacity" values="0.6;0.1;0.6" dur="1.6s" repeatCount="indefinite"/>
            </circle>
          </svg>
        </div>

      </div>
    </div>
  );
}
