interface CapacityBarProps {
  availableKg: number;
  totalKg: number;
}

export default function CapacityBar({ availableKg, totalKg }: CapacityBarProps) {
  const isSoldOut = availableKg <= 0;
  const pctRemaining = totalKg > 0 ? availableKg / totalKg : 0;
  const pctConsumed = totalKg > 0 ? (totalKg - availableKg) / totalKg : 0;
  const isCritical = !isSoldOut && pctRemaining < 0.2;

  const fillColor = isSoldOut
    ? "bg-reef-coral"
    : isCritical
    ? "bg-sunset-gold"
    : "bg-ocean-teal";

  const fillWidth = isSoldOut ? 100 : Math.min(pctConsumed * 100, 100);

  const availDisplay =
    availableKg % 1 === 0
      ? availableKg.toString()
      : availableKg.toFixed(1);
  const totalDisplay =
    totalKg % 1 === 0 ? totalKg.toString() : totalKg.toFixed(1);

  return (
    <div className="space-y-1.5">
      <div
        className="h-2 rounded-full bg-bg-tertiary overflow-hidden border border-border-default"
        role="meter"
        aria-valuenow={availableKg}
        aria-valuemin={0}
        aria-valuemax={totalKg}
        aria-label={`${availableKg}kg of ${totalKg}kg remaining`}
      >
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${fillColor}`}
          style={{ width: `${fillWidth}%` }}
        />
      </div>

      <div className="flex items-center justify-between">
        {isSoldOut ? (
          <span className="text-xs font-mono font-bold text-reef-coral tracking-wider uppercase">
            Sold Out
          </span>
        ) : (
          <span
            className={`text-xs font-mono ${
              isCritical ? "text-sunset-gold font-semibold" : "text-text-secondary"
            }`}
          >
            {availDisplay}kg left of {totalDisplay}kg
          </span>
        )}
        {isCritical && !isSoldOut && (
          <span className="text-xs font-mono text-sunset-gold animate-pulse">
            Almost gone!
          </span>
        )}
      </div>
    </div>
  );
}
