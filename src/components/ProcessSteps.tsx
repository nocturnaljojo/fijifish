"use client";

import { useRef, useState, useEffect } from "react";
import {
  motion,
  useMotionValue,
  useTransform,
} from "framer-motion";
import { ShoppingCart, Fish, Truck, type LucideIcon } from "lucide-react";

// ── Step definitions ──────────────────────────────────────────────────────────

type StepData = {
  number: string;
  icon: LucideIcon;
  accentColor: string;
  title: string;
  body: string;
  detail: string;
  cta?: true;
};

const STEPS: StepData[] = [
  {
    number: "01",
    icon: ShoppingCart,
    accentColor: "#4fc3f7",
    title: "You Pre-Order",
    body: "Order by Monday night. Pick your fish, choose your quantity. Payment secures your spot on the flight.",
    detail: "🔴 Window closes Monday 11:59 PM AEST",
  },
  {
    number: "02",
    icon: Fish,
    accentColor: "#66bb6a",
    title: "We Catch",
    body: "Fishermen in Bua Province head to the reefs specifically for your order. No waste, no freezing — just fresh.",
    detail: "📍 Galoa Village, Bua, Vanua Levu 🇫🇯",
  },
  {
    number: "03",
    icon: Truck,
    accentColor: "#ffab40",
    title: "Thursday Delivery",
    body: "Your vacuum-sealed fillets arrive at your door in the Riverina. Reef to table in under 48 hours.",
    detail: "✈️ FJ911 Nadi → Sydney → Riverina",
    cta: true,
  },
];

// ── Card — shared layout for both desktop and mobile ─────────────────────────

function StepCard({ step, className = "" }: { step: StepData; className?: string }) {
  const Icon = step.icon;
  return (
    <div
      className={`relative flex flex-col gap-4 bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl overflow-hidden ${className}`}
    >
      {/* Watermark number */}
      <span
        className="absolute top-4 right-6 font-black leading-none select-none pointer-events-none"
        style={{ fontSize: "7rem", color: step.accentColor, opacity: 0.05, lineHeight: 1 }}
        aria-hidden="true"
      >
        {step.number}
      </span>

      {/* Icon */}
      <div
        className="relative inline-flex items-center justify-center w-14 h-14 rounded-2xl"
        style={{
          backgroundColor: `${step.accentColor}18`,
          border: `1px solid ${step.accentColor}28`,
        }}
      >
        <Icon size={28} style={{ color: step.accentColor }} strokeWidth={1.5} aria-hidden="true" />
      </div>

      {/* Step label + title */}
      <div>
        <p
          className="text-[10px] font-mono tracking-[0.2em] uppercase mb-1"
          style={{ color: step.accentColor }}
        >
          Step {step.number}
        </p>
        <h3 className="text-2xl sm:text-3xl font-bold text-text-primary leading-tight">
          {step.title}
        </h3>
      </div>

      {/* Body */}
      <p className="text-text-secondary text-base leading-relaxed">{step.body}</p>

      {/* Spacer pushes detail / CTA to bottom */}
      <div className="flex-1" />

      {/* Detail */}
      <p className="text-sm font-mono" style={{ color: step.accentColor, opacity: 0.8 }}>
        {step.detail}
      </p>

      {/* CTA on final step */}
      {step.cta && (
        <a
          href="#fish-grid"
          className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold text-sm min-h-[52px] transition-all hover:opacity-90 active:scale-[0.98]"
          style={{ backgroundColor: step.accentColor, color: "#0a0f1a" }}
        >
          Order Now — A$35/kg
          <span aria-hidden="true">→</span>
        </a>
      )}
    </div>
  );
}

// ── Desktop: scroll-driven 3D carousel ───────────────────────────────────────

function DesktopCarousel() {
  const runwayRef = useRef<HTMLDivElement>(null);
  const [activeStep, setActiveStep] = useState(0);

  // Manual scroll tracking — same approach proven in ReefToTable.
  // useScroll({ target }) has opacity-MotionValue issues in framer-motion 12 + React 19.
  const progress = useMotionValue(0);

  useEffect(() => {
    const onScroll = () => {
      const el = runwayRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const totalScrollable = el.offsetHeight - window.innerHeight;
      if (totalScrollable <= 0) return;
      const scrolled = -rect.top;
      const p = Math.min(1, Math.max(0, scrolled / totalScrollable));
      progress.set(p);

      // Update active step state only on boundary crossings
      const next = p < 0.50 ? 0 : p < 0.80 ? 1 : 2;
      setActiveStep((prev) => (prev !== next ? next : prev));
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll(); // seed on mount
    return () => window.removeEventListener("scroll", onScroll);
  }, [progress]);

  // ── Card 1: visible 0–0.40, exits 0.40–0.52 ─────────────────────────────
  const c1RotateY = useTransform(progress, [0, 0.40, 0.52], [0, 0, -90]);
  const c1Opacity = useTransform(progress, [0, 0.40, 0.52], [1, 1, 0]);
  const c1Scale   = useTransform(progress, [0, 0.40, 0.52], [1, 1, 0.85]);

  // ── Card 2: enters 0.40–0.52, visible 0.52–0.68, exits 0.68–0.80 ────────
  const c2RotateY = useTransform(progress, [0.40, 0.52, 0.68, 0.80], [90, 0, 0, -90]);
  const c2Opacity = useTransform(progress, [0.40, 0.52, 0.68, 0.80], [0, 1, 1, 0]);
  const c2Scale   = useTransform(progress, [0.40, 0.52, 0.68, 0.80], [0.85, 1, 1, 0.85]);

  // ── Card 3: enters 0.68–0.80, visible 0.80–1.0 ───────────────────────────
  const c3RotateY = useTransform(progress, [0.68, 0.80, 1.0], [90, 0, 0]);
  const c3Opacity = useTransform(progress, [0.68, 0.80, 1.0], [0, 1, 1]);
  const c3Scale   = useTransform(progress, [0.68, 0.80, 1.0], [0.85, 1, 1]);

  // Scroll nudge fades out immediately after scrolling starts
  const nudgeOpacity = useTransform(progress, [0, 0.06], [1, 0]);

  // Radial glow fades between accent colours
  const glowColor = STEPS[activeStep].accentColor;

  const cardMotions = [
    { rotateY: c1RotateY, opacity: c1Opacity, scale: c1Scale },
    { rotateY: c2RotateY, opacity: c2Opacity, scale: c2Scale },
    { rotateY: c3RotateY, opacity: c3Opacity, scale: c3Scale },
  ];

  return (
    // 300vh scroll runway — gives ~200vh of sticky scroll time
    <div
      ref={runwayRef}
      className="relative"
      style={{ height: "300vh" }}
      aria-label="How FijiFish works — scroll to advance"
    >
      {/* ── Sticky viewport ──────────────────────────────────────────────── */}
      <div className="sticky top-0 h-screen overflow-hidden flex flex-col items-center justify-center bg-bg-primary">

        {/* Accent glow — shifts colour per active step */}
        <div
          className="absolute inset-0 pointer-events-none transition-all duration-700"
          style={{
            background: `radial-gradient(ellipse 70% 60% at 50% 40%, ${glowColor}0c 0%, transparent 65%)`,
          }}
          aria-hidden="true"
        />

        {/* ── Step number chips (top) ─────────────────────────────────── */}
        <div className="relative z-10 flex items-center gap-3 mb-8">
          {STEPS.map((step, i) => (
            <div
              key={i}
              className="flex items-center gap-2 transition-all duration-400"
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-mono font-bold transition-all duration-400"
                style={{
                  backgroundColor: i === activeStep ? `${step.accentColor}20` : "transparent",
                  border: `1.5px solid ${i <= activeStep ? step.accentColor : "#1e2a3a"}`,
                  color: i <= activeStep ? step.accentColor : "#546e7a",
                  opacity: i < activeStep ? 0.5 : 1,
                }}
              >
                {step.number}
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className="w-8 h-px transition-all duration-400"
                  style={{
                    backgroundColor: i < activeStep ? STEPS[i].accentColor : "#1e2a3a",
                    opacity: 0.4,
                  }}
                />
              )}
            </div>
          ))}
        </div>

        {/* ── Card stage ─────────────────────────────────────────────────── */}
        {/*
            All 3 cards are absolute-positioned in the same 480px container.
            opacity + rotateY control which is visible.
            perspective on the outer wrapper creates the 3D depth.
        */}
        <div
          className="relative z-10 w-full max-w-lg px-6"
          style={{ perspective: "1200px" }}
        >
          {/* Sized container — cards are absolute inset-0 so they share this space */}
          <div className="relative" style={{ minHeight: "480px" }}>
            {STEPS.map((step, i) => (
              <motion.div
                key={i}
                className="absolute inset-0"
                style={{
                  rotateY: cardMotions[i].rotateY,
                  opacity: cardMotions[i].opacity,
                  scale: cardMotions[i].scale,
                  zIndex: i === activeStep ? 10 : 5,
                  pointerEvents: i === activeStep ? "auto" : "none",
                }}
                aria-hidden={i !== activeStep}
              >
                <StepCard step={step} className="p-10 h-full" />
              </motion.div>
            ))}
          </div>
        </div>

        {/* ── Progress dots ───────────────────────────────────────────────── */}
        <div className="relative z-10 flex items-center gap-2.5 mt-8">
          {STEPS.map((step, i) => (
            <div
              key={i}
              className="h-2 rounded-full transition-all duration-300"
              style={{
                width: i === activeStep ? "28px" : "8px",
                backgroundColor: i <= activeStep ? step.accentColor : "#1e2a3a",
                opacity: i < activeStep ? 0.4 : 1,
              }}
            />
          ))}
        </div>

        {/* ── Scroll nudge ────────────────────────────────────────────────── */}
        <motion.div
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5"
          style={{ opacity: nudgeOpacity }}
          aria-hidden="true"
        >
          <span className="text-[10px] font-mono text-text-secondary uppercase tracking-widest">
            Scroll
          </span>
          <svg width="16" height="24" viewBox="0 0 16 24" fill="none">
            <rect x="1" y="1" width="14" height="22" rx="7" stroke="#4fc3f7" strokeWidth="1.2" opacity="0.4" />
            <circle cx="8" cy="8" r="2.5" fill="#4fc3f7" opacity="0.6">
              <animate attributeName="cy" values="8;14;8" dur="1.6s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.6;0.1;0.6" dur="1.6s" repeatCount="indefinite" />
            </circle>
          </svg>
        </motion.div>

      </div>
    </div>
  );
}

// ── Mobile: stacked vertical cards with scroll-triggered fade-in ──────────────

function MobileCards() {
  return (
    <div className="space-y-5">
      {STEPS.map((step, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: i * 0.1, ease: "easeOut" }}
        >
          <StepCard step={step} className="p-6" />
        </motion.div>
      ))}
    </div>
  );
}

// ── Section header ────────────────────────────────────────────────────────────

function SectionHeader() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="flex flex-col items-center gap-3 px-4 pt-14 sm:pt-20 pb-8 text-center"
    >
      <span className="inline-block px-3 py-1 rounded-full border border-ocean-teal/20 bg-ocean-teal/5 text-ocean-teal text-xs font-mono tracking-widest uppercase">
        How It Works
      </span>
      <h2 className="text-2xl sm:text-3xl font-bold text-text-primary">
        From Reef to Your Table
      </h2>
      <p className="text-text-secondary text-sm sm:text-base max-w-sm">
        Every Thursday. Caught to order. Delivered to your door.
      </p>
    </motion.div>
  );
}

// ── Public component ──────────────────────────────────────────────────────────

export default function ProcessSteps() {
  return (
    <section aria-label="How FijiFish works — 3 steps">
      {/* Header scrolls away normally before the sticky section takes over */}
      <SectionHeader />

      {/* Desktop: scroll-driven 3D carousel (sticky, 300vh runway) */}
      <div className="hidden md:block">
        <DesktopCarousel />
      </div>

      {/* Mobile: stacked cards with scroll-triggered fade-in */}
      <div className="md:hidden px-4 pb-12">
        <MobileCards />
      </div>
    </section>
  );
}
