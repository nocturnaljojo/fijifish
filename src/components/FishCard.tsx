import CapacityBar from "./CapacityBar";

export interface FishCardData {
  id: string;
  name_fijian: string | null;
  name_english: string;
  name_scientific: string | null;
  cooking_suggestions: string | null;
  price_aud_cents: number;
  available_kg: number;
  total_kg: number;
}

function formatPrice(cents: number): string {
  const dollars = cents / 100;
  return `A$${dollars % 1 === 0 ? dollars : dollars.toFixed(2)}/kg`;
}

export default function FishCard({ fish }: { fish: FishCardData }) {
  const isSoldOut = fish.available_kg <= 0;
  const displayName = fish.name_fijian ?? fish.name_english;
  const subName = fish.name_fijian ? fish.name_english : null;

  return (
    <article className="flex flex-col bg-bg-secondary border border-border-default rounded-2xl overflow-hidden">
      {/* Hero image — 16:9 placeholder */}
      <div className="relative w-full aspect-video bg-bg-tertiary flex items-center justify-center overflow-hidden">
        <div
          className="absolute inset-0"
          aria-hidden="true"
          style={{
            background:
              "radial-gradient(ellipse at 40% 40%, rgba(79,195,247,0.06) 0%, transparent 60%), " +
              "radial-gradient(ellipse at 70% 70%, rgba(102,187,106,0.04) 0%, transparent 50%)",
          }}
        />
        <div className="relative flex flex-col items-center gap-2 text-text-secondary select-none">
          <span className="text-5xl opacity-30" aria-hidden="true">
            🐟
          </span>
          <span className="text-xs font-mono opacity-30 tracking-widest uppercase">
            Photo coming soon
          </span>
        </div>

        {/* Sold-out overlay */}
        {isSoldOut && (
          <div className="absolute inset-0 bg-bg-primary/75 flex items-center justify-center">
            <span className="font-mono font-bold text-reef-coral tracking-widest text-base uppercase border border-reef-coral/40 px-4 py-2 rounded-lg">
              Sold Out
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-5 gap-4">
        {/* Names + origin */}
        <div>
          <h3 className="text-xl font-bold text-text-primary leading-snug">
            {displayName}
          </h3>
          {(subName ?? fish.name_scientific) && (
            <p className="text-sm text-text-secondary mt-0.5">
              {subName && <span>{subName}</span>}
              {subName && fish.name_scientific && (
                <span className="opacity-50"> · </span>
              )}
              {fish.name_scientific && (
                <em className="text-xs opacity-70">{fish.name_scientific}</em>
              )}
            </p>
          )}
          <p className="text-xs text-text-secondary mt-1.5">
            From Galoa Village, Bua&nbsp;🇫🇯
          </p>
        </div>

        {/* Price */}
        <div
          className="font-mono text-2xl font-bold text-sunset-gold"
          aria-label={`Price: ${formatPrice(fish.price_aud_cents)}`}
        >
          {formatPrice(fish.price_aud_cents)}
        </div>

        {/* Capacity */}
        <CapacityBar
          availableKg={fish.available_kg}
          totalKg={fish.total_kg}
        />

        {/* Cooking suggestion */}
        {fish.cooking_suggestions && (
          <p className="text-xs text-text-secondary italic leading-relaxed line-clamp-2">
            {fish.cooking_suggestions}
          </p>
        )}

        {/* CTA */}
        <div className="mt-auto pt-1">
          <button
            type="button"
            disabled={isSoldOut}
            className={`w-full py-3 px-4 rounded-lg font-semibold text-sm min-h-[48px] transition-colors ${
              isSoldOut
                ? "bg-bg-tertiary text-text-secondary cursor-not-allowed border border-border-default"
                : "bg-ocean-teal text-bg-primary hover:bg-[#29b6f6] active:bg-[#0288d1]"
            }`}
          >
            {isSoldOut ? "Sold Out" : "Add to Order"}
          </button>
        </div>
      </div>
    </article>
  );
}
