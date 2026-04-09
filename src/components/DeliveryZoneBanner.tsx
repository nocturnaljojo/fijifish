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

export default function DeliveryZoneBanner() {
  return (
    <div className="px-4 py-3 sm:py-4 border-y border-border-default bg-bg-secondary">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
        <span className="text-ocean-teal text-sm font-semibold whitespace-nowrap shrink-0">
          🚚 Delivering to:
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
        <a
          href="#delivery-demand"
          className="text-xs text-ocean-teal hover:text-[#29b6f6] transition-colors whitespace-nowrap shrink-0 sm:ml-auto"
        >
          Not your area? Tell us →
        </a>
      </div>
    </div>
  );
}
