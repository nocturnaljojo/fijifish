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
    <div className="sticky top-0 z-50 bg-bg-primary/95 backdrop-blur-sm border-b border-border-default">
      <div className="max-w-6xl mx-auto px-4">
        <div className="py-2.5 grid grid-cols-1 sm:grid-cols-3 items-center gap-x-4 gap-y-1 text-xs font-mono uppercase tracking-wider">

          {/* Left — next arrival */}
          <div className="flex items-center gap-2">
            <span className="text-lagoon-green">🐟</span>
            <span className="text-text-secondary">Next Arrival:</span>
            <span className="text-text-primary font-bold">Thu 17 Apr</span>
          </div>

          {/* Centre — cargo capacity bar */}
          <div className="hidden sm:flex items-center gap-2">
            <span className="text-text-secondary shrink-0">✈️ Cargo:</span>
            <div className="flex-1 h-1.5 rounded-full bg-border-default overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${CARGO_PCT}%`, backgroundColor: barColor }}
              />
            </div>
            <span style={{ color: barColor }} className="font-bold shrink-0">
              {CARGO_PCT}% Full
            </span>
          </div>

          {/* Right — countdown */}
          <div className="flex items-center gap-1.5 sm:justify-end">
            <span className="text-reef-coral">🔴</span>
            <span className="text-text-secondary">Window Closes:</span>
            <CountdownTimer
              targetTimestamp={ORDER_CLOSE_TIMESTAMP}
              className="font-bold"
              urgentColor="text-reef-coral"
            />
          </div>
        </div>

        {/* Mobile: cargo bar row */}
        <div className="sm:hidden pb-2 flex items-center gap-2 text-xs font-mono uppercase tracking-wider">
          <span className="text-text-secondary shrink-0">✈️ Cargo:</span>
          <div className="flex-1 h-1.5 rounded-full bg-border-default overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{ width: `${CARGO_PCT}%`, backgroundColor: barColor }}
            />
          </div>
          <span style={{ color: barColor }} className="font-bold shrink-0 text-[10px]">
            {CARGO_PCT}%
          </span>
        </div>
      </div>
    </div>
  );
}
