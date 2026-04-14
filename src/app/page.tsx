// Force fresh data on every request — no ISR caching
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { auth } from "@clerk/nextjs/server";
import { createPublicSupabaseClient } from "@/lib/supabase";
import {
  getActiveFlightWindow,
  getWindowInventory,
  calcCargoPercent,
  type InventoryRow,
} from "@/lib/flight-windows";
import { FLIGHT_CONFIG, CARGO_CONFIG } from "@/lib/config";
import Navbar from "@/components/Navbar";
import DeliveryBanner from "@/components/DeliveryBanner";
import DeliveryZoneBanner from "@/components/DeliveryZoneBanner";
import HeroSection from "@/components/HeroSection";
import FishCard, { type FishCardData } from "@/components/FishCard";
import ProcessSteps from "@/components/ProcessSteps";
import UnlockBoard, { type LockedFish } from "@/components/UnlockBoard";
import UnlockCelebration from "@/components/UnlockCelebration";
import DeliveryDemandPoll from "@/components/DeliveryDemandPoll";
import VillagePreview from "@/components/VillagePreview";
import Footer from "@/components/Footer";
import SocialProof from "@/components/SocialProof";
import StickyOrderBar from "@/components/StickyOrderBar";
import UrgencyBanner from "@/components/UrgencyBanner";

// ── Types ─────────────────────────────────────────────────────────────────────

type FishRow = {
  id: string;
  name_fijian: string | null;
  name_english: string;
  name_scientific: string | null;
  cooking_suggestions: string | null;
  unlock_status: string;
  unlock_votes_target: number;
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

// ── Fallback inventory (used when no DB inventory available) ──────────────────

const TEST_INVENTORY: Record<
  string,
  { price_aud_cents: number; available_kg: number; total_kg: number }
> = {
  Walu:     { price_aud_cents: 3500, available_kg: 72, total_kg: 100 },
  Kawakawa: { price_aud_cents: 3500, available_kg: 15, total_kg: 80  },
  Donu:     { price_aud_cents: 5500, available_kg: 8,  total_kg: 40  },
  Saqa:     { price_aud_cents: 3800, available_kg: 0,  total_kg: 60  },
  Urau:     { price_aud_cents: 9800, available_kg: 25, total_kg: 30  },
  Kacika:   { price_aud_cents: 4500, available_kg: 40, total_kg: 60  },
  Sabutu:   { price_aud_cents: 4000, available_kg: 30, total_kg: 50  },
  Kawago:   { price_aud_cents: 3600, available_kg: 55, total_kg: 70  },
};

const DEFAULT_INVENTORY = { price_aud_cents: 4000, available_kg: 60, total_kg: 100 };

// ── Helpers ───────────────────────────────────────────────────────────────────

function isInSeason(
  seasons: { month_start: number; month_end: number }[],
  month: number,
): boolean {
  return seasons.some((s) => {
    if (s.month_start <= s.month_end) {
      return month >= s.month_start && month <= s.month_end;
    }
    return month >= s.month_start || month <= s.month_end;
  });
}

function resolveInventory(
  fishId: string,
  nameFijian: string | null,
  nameEnglish: string,
  dbInventory: InventoryRow[],
): { price_aud_cents: number; available_kg: number; total_kg: number } {
  const dbRow = dbInventory.find((r) => r.fish_species_id === fishId);
  if (dbRow) {
    return {
      price_aud_cents: dbRow.price_aud_cents,
      available_kg: Number(dbRow.available_kg),
      total_kg: Number(dbRow.total_capacity_kg),
    };
  }
  return (
    (nameFijian ? TEST_INVENTORY[nameFijian] : undefined) ??
    TEST_INVENTORY[nameEnglish] ??
    DEFAULT_INVENTORY
  );
}

function sortFish(fish: FishCardData[]): FishCardData[] {
  return [...fish].sort((a, b) => {
    const aName = (a.name_fijian ?? a.name_english).toLowerCase();
    const bName = (b.name_fijian ?? b.name_english).toLowerCase();
    if (aName === "walu") return -1;
    if (bName === "walu") return 1;
    return aName.localeCompare(bName);
  });
}

// ── Data fetchers ─────────────────────────────────────────────────────────────

async function getAllFish(dbInventory: InventoryRow[]): Promise<{
  availableFish: FishCardData[];
  lockedFish: LockedFish[];
}> {
  try {
    const supabase = createPublicSupabaseClient();
    const [fishRes, votesRes] = await Promise.all([
      supabase
        .from("fish_species")
        .select(
          "id, name_fijian, name_english, name_scientific, cooking_suggestions, unlock_status, unlock_votes_target, seasons(month_start, month_end)",
        )
        .eq("is_active", true),
      supabase
        .from("fish_interest_summary")
        .select("fish_species_id, vote_count"),
    ]);

    if (fishRes.error || !fishRes.data) return { availableFish: [], lockedFish: [] };

    const voteMap = new Map<string, number>(
      ((votesRes.data ?? []) as { fish_species_id: string; vote_count: number }[]).map(
        (r) => [r.fish_species_id, r.vote_count],
      ),
    );

    const currentMonth = new Date().getMonth() + 1;
    const availableFish: FishCardData[] = [];
    const lockedFish: LockedFish[] = [];

    for (const fish of fishRes.data as FishRow[]) {
      if (fish.unlock_status === "available") {
        if (isInSeason(fish.seasons ?? [], currentMonth)) {
          availableFish.push({
            id: fish.id,
            name_fijian: fish.name_fijian,
            name_english: fish.name_english,
            name_scientific: fish.name_scientific,
            cooking_suggestions: fish.cooking_suggestions,
            ...resolveInventory(fish.id, fish.name_fijian, fish.name_english, dbInventory),
          });
        }
      } else if (fish.unlock_status === "locked" || fish.unlock_status === "coming_soon") {
        lockedFish.push({
          id: fish.id,
          name_fijian: fish.name_fijian,
          name_english: fish.name_english,
          name_scientific: fish.name_scientific,
          unlock_votes_target: fish.unlock_votes_target ?? 30,
          current_votes: voteMap.get(fish.id) ?? 0,
        });
      }
    }

    return { availableFish: sortFish(availableFish), lockedFish };
  } catch {
    return { availableFish: [], lockedFish: [] };
  }
}

async function getGaloaVillage(): Promise<VillageRow | null> {
  try {
    const supabase = createPublicSupabaseClient();
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
    const supabase = createPublicSupabaseClient();
    const { data, error } = await supabase
      .from("fish_interest_summary")
      .select("fish_species_id, name_fijian, name_english, vote_count");
    if (error || !data) return [];
    return data as SurveyRow[];
  } catch {
    return [];
  }
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function Home() {
  const { userId } = await auth();
  const isSignedIn = !!userId;

  // Fetch active flight window first — it drives capacity and countdown data
  const activeWindow = await getActiveFlightWindow();
  const dbInventory = activeWindow
    ? await getWindowInventory(activeWindow.id)
    : [];

  // Fetch the rest in parallel
  const [{ availableFish, lockedFish }, village, surveySpecies] = await Promise.all([
    getAllFish(dbInventory),
    getGaloaVillage(),
    getSurveySpecies(),
  ]);

  // Resolve display values: prefer DB, fall back to config
  const orderCloseAt = activeWindow
    ? new Date(activeWindow.order_close_at).getTime()
    : FLIGHT_CONFIG.orderCloseAt;

  const cargoPercent =
    calcCargoPercent(dbInventory) ?? CARGO_CONFIG.capacityPercent;

  // Available fish for celebration toast (compare against user's localStorage votes)
  const availableFishForCelebration = availableFish.map((f) => ({
    id: f.id,
    name_fijian: f.name_fijian,
    name_english: f.name_english,
  }));

  return (
    <div className="flex flex-col min-h-screen">
      <DeliveryBanner />
      <Navbar />

      <main className="flex-1">
        {/* 1 — Hero */}
        <HeroSection />

        {/* 2 — Social proof bar */}
        <SocialProof />

        {/* 3 — Available fish — orderable now */}
        <section id="fish-grid" className="px-4 py-12 sm:py-16 scroll-mt-20">
          <div className="max-w-6xl mx-auto">
            <div className="mb-8 sm:mb-10 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-text-primary mb-1.5">
                  In Season Now
                </h2>
                <p className="text-text-secondary text-sm sm:text-base">
                  Wild-caught from Pacific Island reefs — order before the
                  flight window closes.
                </p>
              </div>
              <span className="text-xs font-mono text-reef-coral border border-reef-coral/30 rounded-full px-3 py-1 whitespace-nowrap self-start sm:self-auto flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-reef-coral animate-pulse inline-block" aria-hidden="true" />
                NEXT FLIGHT
              </span>
            </div>

            <UrgencyBanner
              orderCloseAt={orderCloseAt}
              cargoPercent={cargoPercent}
            />

            {availableFish.length === 0 ? (
              <div className="py-20 text-center border border-white/10 rounded-2xl bg-white/5 backdrop-blur-sm">
                <span className="text-5xl block mb-4" aria-hidden="true">🌊</span>
                <p className="text-text-primary font-semibold text-lg mb-2">
                  No fish available this season
                </p>
                <p className="text-text-secondary text-sm max-w-xs mx-auto">
                  Check back soon — the catch calendar changes with the seasons.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
                {availableFish.map((fish, i) => {
                  const isWalu =
                    fish.name_fijian?.toLowerCase() === "walu" ||
                    fish.name_english.toLowerCase() === "walu";
                  return (
                    <FishCard
                      key={fish.id}
                      fish={fish}
                      isHero={isWalu && i === 0}
                      index={i}
                      orderCloseAt={orderCloseAt}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* 4 — Reef to Table: 3-step process */}
        <ProcessSteps />

        {/* 5 — Village + community impact */}
        <VillagePreview village={village} />

        {/* 6 — Unlock board — community voting for locked species */}
        {lockedFish.length > 0 && (
          <section id="unlock" className="px-4 pb-12 sm:pb-16 scroll-mt-20">
            <div className="max-w-6xl mx-auto">
              <UnlockBoard lockedFish={lockedFish} isSignedIn={isSignedIn} />
            </div>
          </section>
        )}

        {/* 7 — Delivery zones + unlock your area (combined) */}
        <DeliveryZoneBanner />
        <section id="delivery-demand" className="px-4 py-10 sm:py-12 scroll-mt-20">
          <div className="max-w-6xl mx-auto">
            <DeliveryDemandPoll species={surveySpecies} />
          </div>
        </section>
      </main>

      <Footer />

      <StickyOrderBar cargoPercent={cargoPercent} />

      {/* Unlock celebration toast — shows when a voted fish gets unlocked */}
      <UnlockCelebration availableFish={availableFishForCelebration} />
    </div>
  );
}
