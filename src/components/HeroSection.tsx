export default function HeroSection() {
  return (
    <section className="relative overflow-hidden pt-14 pb-20 px-4 sm:pt-20 sm:pb-28">
      {/* Ocean-teal radial glow from top */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(ellipse 90% 55% at 50% -5%, rgba(79,195,247,0.11) 0%, transparent 65%), " +
            "radial-gradient(ellipse 50% 35% at 85% 75%, rgba(102,187,106,0.06) 0%, transparent 55%)",
        }}
      />

      {/* Subtle tactical grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
        style={{
          backgroundImage:
            "linear-gradient(rgba(79,195,247,0.04) 1px, transparent 1px), " +
            "linear-gradient(90deg, rgba(79,195,247,0.04) 1px, transparent 1px)",
          backgroundSize: "80px 80px",
        }}
      />

      <div className="relative max-w-4xl mx-auto text-center">
        {/* Live status badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 mb-8 rounded-full border border-ocean-teal/25 bg-ocean-teal/5 text-ocean-teal text-xs font-mono tracking-widest uppercase">
          <span
            className="w-1.5 h-1.5 rounded-full bg-lagoon-green animate-pulse inline-block"
            aria-hidden="true"
          />
          Live — Orders open now
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-text-primary leading-tight tracking-tight mb-6">
          Fresh from{" "}
          <span
            className="text-ocean-teal"
            style={{
              textShadow: "0 0 40px rgba(79,195,247,0.25)",
            }}
          >
            Fiji&apos;s Reefs
          </span>
          <br />
          to Your Table
        </h1>

        <p className="max-w-2xl mx-auto text-base sm:text-lg text-text-secondary leading-relaxed mb-10">
          Wild-caught by Pacific Island fishermen — air-freighted to your door
          in the Riverina. Pre-order before the flight window closes.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
          <a
            href="#fish-grid"
            className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-lg bg-ocean-teal text-bg-primary font-semibold text-base min-h-[48px] hover:bg-[#29b6f6] active:bg-[#0288d1] transition-colors w-full sm:w-auto"
          >
            🐟 See What&apos;s Fresh
          </a>
          <a
            href="#village"
            className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-lg border border-border-default text-text-secondary font-medium text-base min-h-[48px] hover:border-ocean-teal/40 hover:text-text-primary transition-colors w-full sm:w-auto"
          >
            Meet the Village
          </a>
        </div>

        {/* Trust markers */}
        <div className="mt-12 pt-8 border-t border-border-default/40 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-text-secondary text-sm">
          <span className="flex items-center gap-2">
            <span className="text-lagoon-green" aria-hidden="true">✓</span>
            Air-freighted Fiji Airways
          </span>
          <span className="flex items-center gap-2">
            <span className="text-lagoon-green" aria-hidden="true">✓</span>
            Caught to door in 48hrs
          </span>
          <span className="flex items-center gap-2">
            <span className="text-lagoon-green" aria-hidden="true">✓</span>
            Riverina NSW delivery
          </span>
        </div>
      </div>
    </section>
  );
}
