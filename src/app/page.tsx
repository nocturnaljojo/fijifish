import { createServerSupabaseClient } from "@/lib/supabase";
import DeliveryBanner from "@/components/DeliveryBanner";
import DeliveryZoneBanner from "@/components/DeliveryZoneBanner";
import HeroSection from "@/components/HeroSection";
import FishCard, { type FishCardData } from "@/components/FishCard";
import GaloaMap from "@/components/GaloaMap";
import ImpactFeed from "@/components/ImpactFeed";
import FishSurvey from "@/components/FishSurvey";
import DeliveryDemandPoll from "@/components/DeliveryDemandPoll";
import VillagePreview from "@/components/VillagePreview";
import Footer from "@/components/Footer";

// ── Types ────────────────────────────────────────────────────────────────────

type FishRow = {
  id: string;
  name_fijian: string | null;
  name_english: string;
  name_scientific: string | null;
  cooking_suggestions: string | null;
  seasons: { month_start: number; month_end: number }[];
};

type VillageRow = {
  name: string;
  province: string;
  island: string;
  description: string | null;
  impact_summary: string | null;
};

type SurveyRow = {
  fish_species_id: string;
  name_fijian: string | null;
  name_english: string;
  vote_count: number;
};

// ── Test inventory ─────────────────────────────────────────────────────────
// Hardcoded until inventory_availability is wired in Phase 1b.

const TEST_INVENTORY: Record<
  string,
  { price_aud_cents: number; available_kg: number; total_kg: number }
> = {
  Walu:     { price_aud_cents: 4200, available_kg: 72, total_kg: 100 },
  Kawakawa: { price_aud_cents: 3500, available_kg: 15, total_kg: 80  },
  Donu:     { price_aud_cents: 5500, available_kg: 8,  total_kg: 40  },
  Saqa:     { price_aud_cents: 3800, available_kg: 0,  total_kg: 60  },
  Urau:     { price_aud_cents: 9800, available_kg: 25, total_kg: 30  },
  Kacika:   { price_aud_cents: 4500, available_kg: 40, total_kg: 60  },
  Sabutu:   { price_aud_cents: 4000, available_kg: 30, total_kg: 50  },
  Kawago:   { price_aud_cents: 3600, available_kg: 55, total_kg: 70  },
};
const DEFAULT_INVENTORY = {
  price_aud_cents: 4000,
  available_kg: 60,
  total_kg: 100,
};

// ── Helpers ───────────────────────────────────────────────────────────────

function isInSeason(
  seasons: { month_start: number; month_end: number }[],
  month: number,
): boolean {
  return seasons.some((s) => {
    if (s.month_start <= s.month_end) {
      return month >= s.month_start && month <= s.month_end;
    }
    // wrap-around season (e.g. Nov–Feb: month_start=11, month_end=2)
    return month >= s.month_start || month <= s.month_end;
  });
}

function resolveInventory(nameFijian: string | null, nameEnglish: string) {
  return (
    (nameFijian ? TEST_INVENTORY[nameFijian] : undefined) ??
    TEST_INVENTORY[nameEnglish] ??
    DEFAULT_INVENTORY
  );
}

/** Walu first, then alphabetical by Fijian name */
function sortFish(fish: FishCardData[]): FishCardData[] {
  return [...fish].sort((a, b) => {
    const aName = (a.name_fijian ?? a.name_english).toLowerCase();
    const bName = (b.name_fijian ?? b.name_english).toLowerCase();
    if (aName === "walu") return -1;
    if (bName === "walu") return 1;
    return aName.localeCompare(bName);
  });
}

// ── Data fetchers ─────────────────────────────────────────────────────────

async function getSeasonalFish(): Promise<FishCardData[]> {
  try {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from("fish_species")
      .select(
        "id, name_fijian, name_english, name_scientific, cooking_suggestions, seasons(month_start, month_end)",
      )
      .eq("is_active", true);

    if (error || !data) return [];

    const currentMonth = new Date().getMonth() + 1; // 1–12

    const seasonal = (data as FishRow[])
      .filter((fish) => isInSeason(fish.seasons ?? [], currentMonth))
      .map((fish) => ({
        id: fish.id,
        name_fijian: fish.name_fijian,
        name_english: fish.name_english,
        name_scientific: fish.name_scientific,
        cooking_suggestions: fish.cooking_suggestions,
        ...resolveInventory(fish.name_fijian, fish.name_english),
      }));

    return sortFish(seasonal);
  } catch {
    return [];
  }
}

async function getGaloaVillage(): Promise<VillageRow | null> {
  try {
    const supabase = createServerSupabaseClient();
    const { data } = await supabase
      .from("villages")
      .select("name, province, island, description, impact_summary")
      .eq("name", "Galoa")
      .eq("is_active", true)
      .single();
    return (data as VillageRow) ?? null;
  } catch {
    return null;
  }
}

async function getSurveySpecies(): Promise<SurveyRow[]> {
  try {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from("fish_interest_summary")
      .select("fish_species_id, name_fijian, name_english, vote_count");

    if (error || !data) return [];
    return data as SurveyRow[];
  } catch {
    return [];
  }
}

// ── Page ──────────────────────────────────────────────────────────────────

export default async function Home() {
  const [fishList, village, surveySpecies] = await Promise.all([
    getSeasonalFish(),
    getGaloaVillage(),
    getSurveySpecies(),
  ]);

  return (
    <div className="flex flex-col min-h-screen">
      <DeliveryBanner />

      <main className="flex-1">
        {/* 1 — Hero */}
        <HeroSection />

        {/* 2 — Delivery zone awareness */}
        <DeliveryZoneBanner />

        {/* 3 — Seasonal fish grid */}
        <section
          id="fish-grid"
          className="px-4 py-12 sm:py-16 scroll-mt-20"
        >
          <div className="max-w-6xl mx-auto">
            <div className="mb-8 sm:mb-10 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-text-primary mb-1.5">
                  In Season Now
                </h2>
                <p className="text-text-secondary text-sm sm:text-base">
                  Wild-caught from the reefs of Galoa Village — order before the
                  flight window closes.
                </p>
              </div>
              <span className="text-xs font-mono text-text-secondary border border-border-default rounded-full px-3 py-1 whitespace-nowrap self-start sm:self-auto">
                April 2026
              </span>
            </div>

            {fishList.length === 0 ? (
              <div className="py-20 text-center border border-border-default rounded-2xl bg-bg-secondary">
                <span className="text-5xl block mb-4" aria-hidden="true">
                  🌊
                </span>
                <p className="text-text-primary font-semibold text-lg mb-2">
                  No fish available this season
                </p>
                <p className="text-text-secondary text-sm max-w-xs mx-auto">
                  Check back soon — the catch calendar changes with the seasons.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
                {fishList.map((fish) => (
                  <FishCard key={fish.id} fish={fish} />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* 4 — Galoa animated map */}
        <GaloaMap />

        {/* 5 — Impact stories feed */}
        <ImpactFeed />

        {/* 6 — Fish interest survey (auth required) */}
        <FishSurvey species={surveySpecies} />

        {/* 7 — Delivery demand poll (auth required) */}
        <DeliveryDemandPoll species={surveySpecies} />

        {/* 8 — Village preview */}
        <VillagePreview village={village} />
      </main>

      <Footer />
    </div>
  );
}
