import CountdownTimer from "./CountdownTimer";

// Test window: 3 days from 2026-04-09. Delivery Wednesday 16 April.
// Order close: 2026-04-12 23:59 AEST (UTC+10) = 2026-04-12T13:59:00Z
const ORDER_CLOSE_TIMESTAMP = new Date("2026-04-12T13:59:00.000Z").getTime();

export default function DeliveryBanner() {
  return (
    <div className="sticky top-0 z-50 bg-bg-primary/95 backdrop-blur-sm border-b border-border-default">
      <div className="max-w-6xl mx-auto px-4">
        <div className="py-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-sm">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5">
            <span className="text-text-primary font-medium">
              🐟 Next delivery:{" "}
              <span className="text-ocean-teal font-semibold">
                Wednesday 16 April
              </span>
            </span>
            <span className="text-text-secondary hidden sm:inline text-xs">
              ✈️&nbsp; Fiji Airways FJ391 — Labasa → Canberra
            </span>
          </div>
          <div className="flex items-center gap-2 text-text-secondary text-sm">
            <span className="text-xs">⏰ Orders close in:</span>
            <CountdownTimer
              targetTimestamp={ORDER_CLOSE_TIMESTAMP}
              className="text-sm font-semibold"
            />
          </div>
        </div>
        {/* Mobile-only flight line */}
        <div className="sm:hidden pb-2 text-xs text-text-secondary">
          ✈️&nbsp; FJ391 Labasa → Canberra
        </div>
      </div>
    </div>
  );
}
