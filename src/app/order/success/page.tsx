"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function formatArrivalDate(flightDate: string | null): string | null {
  if (!flightDate) return null;
  const d = new Date(flightDate + "T00:00:00");
  if (isNaN(d.getTime())) return null;
  const weekday = d.toLocaleDateString("en-AU", { weekday: "long" });
  const day = d.getDate();
  const month = d.toLocaleDateString("en-AU", { month: "long" });
  return `${weekday} ${day} ${month}`;
}

const NORMAL_STEPS = [
  { icon: "✅", label: "Order placed", done: true },
  { icon: "🎣", label: "Fishermen catching your order in Bua Province", done: false },
  { icon: "✈️", label: "Air-freighted to Sydney via Fiji Airways", done: false },
  { icon: "🚚", label: "Delivered to your door", done: false },
];

const PREORDER_STEPS = [
  { icon: "✅", label: "Pre-order confirmed — payment received", done: true },
  { icon: "🗓️", label: "Waiting for catch window to open", done: false },
  { icon: "🎣", label: "Fish caught fresh to your order", done: false },
  { icon: "✈️", label: "Air-freighted to Sydney via Fiji Airways", done: false },
  { icon: "🚚", label: "Delivered to your door", done: false },
];

function OrderSuccessContent() {
  const params = useSearchParams();
  const isPreOrder = params.get("preorder") === "true";
  const flightDate = params.get("flight_date");
  const arrivalLabel = formatArrivalDate(flightDate);

  const steps = isPreOrder ? PREORDER_STEPS : NORMAL_STEPS;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-16" style={{ background: "var(--bg-primary, #0a0f1a)" }}>
      <div className="max-w-lg w-full space-y-8">
        {/* Confirmation */}
        <div className="text-center">
          <div className="text-6xl mb-4" aria-hidden="true">🎉</div>
          <h1 className="text-2xl sm:text-3xl font-bold text-text-primary mb-2">
            {isPreOrder ? "Pre-order Confirmed!" : "Order Confirmed!"}
          </h1>
          <p className="text-text-secondary text-base leading-relaxed">
            {isPreOrder
              ? "Your catch is reserved. Your fish will be caught fresh when the window opens — we'll send updates by email."
              : "Your Walu is being caught fresh right now. You'll receive delivery updates via email."}
          </p>
        </div>

        {/* Arrival date — prominently displayed when available */}
        {arrivalLabel && (
          <div className="flex items-center gap-3 px-5 py-4 rounded-2xl bg-ocean-teal/8 border border-ocean-teal/25 text-center justify-center">
            <span className="text-2xl shrink-0" aria-hidden="true">📦</span>
            <p className="text-lg font-semibold text-text-primary">
              Your fish will arrive{" "}
              <span className="text-ocean-teal font-bold">{arrivalLabel}</span>
            </p>
          </div>
        )}

        {/* What happens next */}
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-white/10">
            <h2 className="text-xs font-mono text-text-secondary uppercase tracking-wider">What Happens Next</h2>
          </div>
          <ol className="divide-y divide-white/5">
            {steps.map((step, i) => (
              <li key={i} className="flex items-start gap-4 px-5 py-4">
                <span className="text-xl shrink-0" aria-hidden="true">{step.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${step.done ? "text-lagoon-green" : "text-text-secondary"}`}>
                    {step.label}
                  </p>
                </div>
                {step.done && (
                  <span className="text-xs font-mono text-lagoon-green shrink-0">Done</span>
                )}
              </li>
            ))}
          </ol>
        </div>

        {/* Referral prompt */}
        <div className="bg-ocean-teal/5 border border-ocean-teal/20 rounded-2xl p-5 text-center">
          <p className="text-text-primary font-semibold mb-1">Know someone who&apos;d love this?</p>
          <p className="text-text-secondary text-sm mb-4">
            Share FijiFish with friends in the Riverina — they&apos;ll thank you when the Walu arrives.
          </p>
          <button
            type="button"
            onClick={() => {
              if (navigator.share) {
                navigator.share({ title: "FijiFish", text: "Fresh Walu from Fiji, delivered to the Riverina", url: window.location.origin });
              } else {
                navigator.clipboard.writeText(window.location.origin).catch(() => null);
              }
            }}
            className="px-6 py-2.5 rounded-lg bg-ocean-teal text-bg-primary font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            Share FijiFish
          </button>
        </div>

        <div className="text-center">
          <Link href="/" className="text-ocean-teal text-sm font-medium hover:underline">
            ← Back to shop
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function OrderSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg-primary, #0a0f1a)" }}>
        <div className="text-text-secondary text-sm font-mono">Loading…</div>
      </div>
    }>
      <OrderSuccessContent />
    </Suspense>
  );
}
