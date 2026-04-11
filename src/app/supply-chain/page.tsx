import Link from "next/link";
import GaloaMap from "@/components/GaloaMap";

export const metadata = {
  title: "Supply Chain — FijiFish",
  description: "How your fish travels from Bua Province, Fiji to your door in the Riverina.",
};

export default function SupplyChainPage() {
  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary, #0a0f1a)" }}>
      <div className="max-w-4xl mx-auto px-4 pt-12 pb-4">
        <Link href="/" className="text-xs font-mono text-text-secondary hover:text-ocean-teal transition-colors">
          ← Back to home
        </Link>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-10">
          <p className="text-xs font-mono text-ocean-teal uppercase tracking-widest mb-2">Supply Chain</p>
          <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-3">
            Ocean to Doorstep — 48 Hours
          </h1>
          <p className="text-text-secondary text-base leading-relaxed max-w-2xl">
            Every order starts at the reef in Bua Province and reaches your door in the Riverina within 48 hours.
            Here&apos;s how it works.
          </p>
        </div>

        {/* Journey steps */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
          {[
            { step: "01", icon: "🎣", title: "Caught to Order", body: "Fishermen in Galoa Village catch only what's been ordered. No stockpiling — every fish has a buyer before it leaves the water." },
            { step: "02", icon: "✈️", title: "Fiji Airways Cargo", body: "Vacuum-sealed fillets are air-freighted on Fiji Airways flight FJ911 — Labasa to Nadi to Sydney — arriving the same day." },
            { step: "03", icon: "🚚", title: "Riverina Delivery", body: "Sydney customs cleared, then same-day cold-chain delivery to your door. Wagga Wagga, Albury, and surrounding zones." },
          ].map((s) => (
            <div key={s.step} className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <p className="text-xs font-mono text-ocean-teal uppercase tracking-widest mb-2">Step {s.step}</p>
              <span className="text-3xl block mb-3" aria-hidden="true">{s.icon}</span>
              <h3 className="font-bold text-text-primary mb-2">{s.title}</h3>
              <p className="text-text-secondary text-sm leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>

        {/* Map */}
        <div className="mb-12">
          <h2 className="text-xl font-bold text-text-primary mb-6">The Route</h2>
          <GaloaMap />
        </div>

        <div className="text-center py-8">
          <Link
            href="/#fish-grid"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-ocean-teal text-bg-primary font-bold text-base hover:opacity-90 transition-opacity"
          >
            Order Fresh Walu — A$35/kg
          </Link>
        </div>
      </div>
    </div>
  );
}
