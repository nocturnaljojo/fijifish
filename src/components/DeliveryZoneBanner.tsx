const ZONES = [
  "Wagga Wagga",
  "Griffith",
  "Leeton",
  "Narrandera",
  "Canberra",
  "Goulburn",
  "Young",
  "Cowra",
  "Eden",
];

// Hardcoded teaser data until demand poll is wired realtime
const DEMAND_TEASERS = [
  { suburb: "Newcastle", count: 15, target: 20 },
  { suburb: "Albury", count: 11, target: 20 },
  { suburb: "Orange", count: 7, target: 20 },
];

export default function DeliveryZoneBanner() {
  return (
    <div className="px-4 py-4 sm:py-5 border-y border-border-default bg-white/5 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8">

        {/* Left — current zones */}
        <div className="flex flex-col gap-2">
          <span className="text-ocean-teal text-xs font-mono tracking-widest uppercase font-semibold">
            🚚 Currently Delivering To
          </span>
          <div className="flex flex-wrap gap-x-2 gap-y-1">
            {ZONES.map((zone, i) => (
              <span key={zone} className="text-sm text-text-secondary">
                <span className="text-text-primary">{zone}</span>
                {i < ZONES.length - 1 && (
                  <span className="ml-2 text-border-default select-none">·</span>
                )}
              </span>
            ))}
          </div>
        </div>

        {/* Right — unlock teaser */}
        <div className="flex flex-col gap-2">
          <span className="text-sunset-gold text-xs font-mono tracking-widest uppercase font-semibold">
            🔓 Areas Almost Unlocked
          </span>
          <div className="space-y-1.5">
            {DEMAND_TEASERS.map((t) => {
              const pct = Math.min(100, (t.count / t.target) * 100);
              return (
                <div key={t.suburb} className="flex items-center gap-2">
                  <span className="text-xs text-text-primary w-20 shrink-0">{t.suburb}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-border-default overflow-hidden">
                    <div
                      className="h-full rounded-full bg-sunset-gold/70 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-mono text-text-secondary whitespace-nowrap">
                    {t.count}/{t.target}
                  </span>
                </div>
              );
            })}
          </div>
          <a
            href="#delivery-demand"
            className="text-xs text-sunset-gold hover:text-[#ffc166] transition-colors mt-0.5"
          >
            Not your area? Tell us →
          </a>
        </div>

      </div>
    </div>
  );
}
