"use client";

import { motion } from "framer-motion";
import { ShoppingCart, Fish, Truck } from "lucide-react";

const STEPS = [
  {
    number: "01",
    icon: ShoppingCart,
    title: "You Pre-Order",
    accentColor: "#4fc3f7",
    body: "Order by Monday night. Pick your fish, choose your quantity. Payment secures your spot on the flight.",
    detail: "⏱ Window closes Monday 11:59 PM AEST",
  },
  {
    number: "02",
    icon: Fish,
    title: "We Catch",
    accentColor: "#66bb6a",
    body: "Fishermen in Bua Province head to the reefs specifically for your order. No waste, no freezing — just fresh.",
    detail: "📍 Galoa Village, Bua, Vanua Levu 🇫🇯",
  },
  {
    number: "03",
    icon: Truck,
    title: "Thursday Delivery",
    accentColor: "#ffab40",
    body: "Your vacuum-sealed fillets arrive at your door in the Riverina. Reef to table in under 48 hours.",
    detail: "✈ FJ911 Nadi → Sydney → Riverina",
    cta: true,
  },
] as const;

export default function ProcessSteps() {
  return (
    <section className="px-4 py-14 sm:py-20">
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="mb-10 sm:mb-12 text-center"
        >
          <span className="inline-block px-3 py-1 mb-4 rounded-full border border-ocean-teal/20 bg-ocean-teal/5 text-ocean-teal text-xs font-mono tracking-widest uppercase">
            How It Works
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-text-primary">
            From Reef to Your Table
          </h2>
        </motion.div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 32 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.12, ease: "easeOut" }}
                className="relative bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 overflow-hidden flex flex-col gap-4"
              >
                {/* Watermark number */}
                <span
                  className="absolute top-2 right-4 font-black leading-none select-none pointer-events-none"
                  style={{
                    fontSize: "5rem",
                    color: step.accentColor,
                    opacity: 0.07,
                  }}
                  aria-hidden="true"
                >
                  {step.number}
                </span>

                {/* Icon */}
                <div
                  className="relative inline-flex items-center justify-center w-11 h-11 rounded-xl"
                  style={{
                    backgroundColor: `${step.accentColor}15`,
                    border: `1px solid ${step.accentColor}25`,
                  }}
                >
                  <Icon
                    size={20}
                    style={{ color: step.accentColor }}
                    strokeWidth={1.75}
                    aria-hidden="true"
                  />
                </div>

                {/* Step tag */}
                <div>
                  <span
                    className="text-[10px] font-mono tracking-[0.2em] uppercase"
                    style={{ color: step.accentColor }}
                  >
                    Step {step.number}
                  </span>
                  <h3 className="text-lg font-bold text-text-primary mt-0.5">
                    {step.title}
                  </h3>
                </div>

                {/* Body */}
                <p className="text-text-secondary text-sm leading-relaxed">
                  {step.body}
                </p>

                {/* Detail */}
                <p
                  className="text-xs font-mono mt-auto"
                  style={{ color: step.accentColor, opacity: 0.8 }}
                >
                  {step.detail}
                </p>

                {/* CTA on final step */}
                {"cta" in step && step.cta && (
                  <a
                    href="#fish-grid"
                    className="mt-2 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-sm min-h-[48px] transition-all hover:opacity-90 active:scale-[0.98]"
                    style={{
                      backgroundColor: step.accentColor,
                      color: "#0a0f1a",
                    }}
                  >
                    Order Now — A$35/kg
                    <span aria-hidden="true">→</span>
                  </a>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
