"use client";

import { motion } from "framer-motion";
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
    body: "Order by Monday night. Pick your fish, choose your quantity. Payment secures your spot on the flight — once cargo space is full or the catch window closes, you'll have to wait for the next delivery.",
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

// ── Step Card ─────────────────────────────────────────────────────────────────

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

      {/* Spacer */}
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
      <SectionHeader />

      <div className="max-w-6xl mx-auto px-4 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {STEPS.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.55, delay: i * 0.12, ease: "easeOut" }}
            >
              <StepCard step={step} className="p-7 h-full" />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
