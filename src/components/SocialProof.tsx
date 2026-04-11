"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { SOCIAL_PROOF_STATS } from "@/lib/config";

const STATS = SOCIAL_PROOF_STATS;

function CountUp({ target, suffix }: { target: number; suffix: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    const duration = 1200;
    const steps = 40;
    const increment = target / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [inView, target]);

  return (
    <span ref={ref} className="font-mono font-bold text-text-primary">
      {count.toLocaleString()}{suffix}
    </span>
  );
}

export default function SocialProof() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="max-w-6xl mx-auto px-4 py-4"
    >
      <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 py-4 border-y border-white/5">
        {STATS.map((stat, i) => (
          <span
            key={i}
            className="flex items-center gap-2 text-sm"
          >
            <CountUp target={stat.value} suffix={stat.suffix} />
            <span className="text-text-secondary">{stat.label}</span>
            {i < STATS.length - 1 && (
              <span className="hidden sm:inline text-white/10 ml-6">·</span>
            )}
          </span>
        ))}
      </div>
    </motion.div>
  );
}
