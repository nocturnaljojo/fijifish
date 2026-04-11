import Link from "next/link";
import ImpactFeed from "@/components/ImpactFeed";

export const metadata = {
  title: "Community Impact — FijiFish",
  description: "See how your orders directly fund Galoa Village — new equipment, school supplies, and more.",
};

export default function ImpactPage() {
  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary, #0a0f1a)" }}>
      <div className="max-w-4xl mx-auto px-4 pt-12 pb-4">
        <Link href="/" className="text-xs font-mono text-text-secondary hover:text-ocean-teal transition-colors">
          ← Back to home
        </Link>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-10">
          <p className="text-xs font-mono text-lagoon-green uppercase tracking-widest mb-2">Community Impact</p>
          <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-3">
            Your Orders Fund Real Change
          </h1>
          <p className="text-text-secondary text-base leading-relaxed max-w-2xl">
            A share of every sale goes directly back to Galoa Village in Bua Province.
            Here are the stories of what your purchases have made possible.
          </p>
        </div>

        <ImpactFeed />

        <div className="text-center py-12">
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
