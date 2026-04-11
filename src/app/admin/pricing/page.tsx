import { createServerSupabaseClient } from "@/lib/supabase";
import InventoryManager from "./InventoryManager";

async function getData(windowId: string | null) {
  const supabase = createServerSupabaseClient();
  const [windowsRes, speciesRes, villagesRes] = await Promise.all([
    supabase.from("flight_windows").select("id, flight_date, flight_number, status").order("flight_date", { ascending: false }),
    supabase.from("fish_species").select("id, name_fijian, name_english").eq("is_active", true).order("name_english"),
    supabase.from("villages").select("id, name").eq("is_active", true),
  ]);

  let inventory: unknown[] = [];
  if (windowId) {
    const invRes = await supabase
      .from("inventory_availability")
      .select("id, fish_species_id, village_id, total_capacity_kg, reserved_kg, available_kg, price_aud_cents, price_fjd_cents, fish_species(name_fijian, name_english), villages(name)")
      .eq("flight_window_id", windowId);
    inventory = invRes.data ?? [];
  }

  return {
    windows: windowsRes.data ?? [],
    species: speciesRes.data ?? [],
    villages: villagesRes.data ?? [],
    inventory,
  };
}

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{ window?: string }>;
}) {
  const { window: windowId = null } = await searchParams;
  const { windows, species, villages, inventory } = await getData(windowId);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <p className="text-xs font-mono text-text-secondary uppercase tracking-widest mb-1">Admin</p>
        <h1 className="text-2xl font-bold text-text-primary">Fish & Pricing</h1>
        <p className="text-text-secondary text-sm mt-1">
          Set AUD/FJD prices and total capacity per species per flight window.
          Click any price or capacity to edit inline.
        </p>
      </div>

      <InventoryManager
        windows={windows as Parameters<typeof InventoryManager>[0]["windows"]}
        species={species as Parameters<typeof InventoryManager>[0]["species"]}
        villages={villages as Parameters<typeof InventoryManager>[0]["villages"]}
        inventory={inventory as Parameters<typeof InventoryManager>[0]["inventory"]}
        selectedWindowId={windowId}
      />
    </div>
  );
}
