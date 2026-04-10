import CountdownTimer from "./CountdownTimer";

// Thursday 17 April delivery. Order window closes Tuesday 15 April 23:59 AEST.
const ORDER_CLOSE_TIMESTAMP = new Date("2026-04-15T13:59:00.000Z").getTime();

// Total cargo capacity — hardcoded until inventory_availability wired in Phase 1b
const CARGO_PCT = 72;

export default function DeliveryBanner() {
  const barColor =
    CARGO_PCT >= 90
      ? "#ff7043"
      : CARGO_PCT >= 70
      ? "#ffab40"
      : "#4fc3f7";

  return (
    <div className="sticky top-0 z-50 border-b border-white/10 backdrop-blur-md" style={{ background: "rgba(10,15,26,0.97)" }}>
      <div className="max-w-6xl mx-auto px-4 py-3 sm:py-0">
        <div className="flex flex-col sm:flex-row sm:items-stretch gap-0 divide-y sm:divide-y-0 sm:divide-x divide-white/10">

          {/* Left — next arrival */}
          <div className="flex items-center gap-2.5 sm:py-3 py-2 sm:pr-6">
            <span className="text-lg" aria-hidden="true">✈️</span>
            <div>
              <p className="text-[9px] font-mono uppercase tracking-[0.2em] text-text-secondary leading-none mb-0.5">
                Next Delivery
              </p>
              <p className="text-sm font-bold text-text-primary leading-none">
                Thursday 17 Apr
              </p>
            </div>
          </div>

          {/* Centre — cargo bar */}
          <div className="hidden sm:flex items-center gap-3 sm:py-3 sm:px-6 flex-1">
            <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-text-secondary whitespace-nowrap">
              Flight Capacity
            </span>
            <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ background: "rgba(30,42,58,0.8)" }}>
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${CARGO_PCT}%`, backgroundColor: barColor }}
              />
            </div>
            <span className="text-xs font-mono font-bold whitespace-nowrap" style={{ color: barColor }}>
              {CARGO_PCT}% Full
            </span>
          </div>

          {/* Right — countdown — ALWAYS reef-coral, large */}
          <div className="flex items-center gap-2.5 sm:py-3 sm:pl-6 py-2">
            <span
              className="w-2 h-2 rounded-full bg-reef-coral animate-pulse shrink-0"
              aria-hidden="true"
            />
            <div>
              <p className="text-[9px] font-mono uppercase tracking-[0.2em] text-reef-coral/70 leading-none mb-0.5">
                Catch Window Closes
              </p>
              <CountdownTimer
                targetTimestamp={ORDER_CLOSE_TIMESTAMP}
                className="text-lg sm:text-xl font-bold leading-none"
                baseColor="text-reef-coral"
                urgentColor="text-reef-coral"
              />
            </div>
          </div>

        </div>

        {/* Mobile: cargo bar */}
        <div className="sm:hidden pb-2.5 flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider">
          <span className="text-text-secondary shrink-0">Cargo</span>
          <div className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ background: "rgba(30,42,58,0.8)" }}>
            <div
              className="h-full rounded-full"
              style={{ width: `${CARGO_PCT}%`, backgroundColor: barColor }}
            />
          </div>
          <span className="font-bold shrink-0" style={{ color: barColor }}>
            {CARGO_PCT}%
          </span>
        </div>
      </div>
    </div>
  );
}
