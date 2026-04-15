import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getSupabaseUser } from "@/lib/supabase-auth";
import AccountContent, { type AccountOrder, type AccountOrderItem, type VotedFish } from "./AccountContent";

export const metadata = { title: "My Account — FijiFish" };

export default async function AccountPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in?redirect_url=/account");

  const clerkUser = await currentUser();
  const email = clerkUser?.emailAddresses[0]?.emailAddress ?? null;
  const fullName = [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(" ") || null;

  const supabase = await getSupabaseUser();

  // ── Look up DB user ────────────────────────────────────────────────────────
  const { data: dbUser } = await supabase
    .from("users")
    .select("id, phone")
    .eq("clerk_id", userId)
    .maybeSingle();

  // No DB record yet (never placed an order) — show empty state
  if (!dbUser) {
    return (
      <AccountContent
        email={email}
        fullName={fullName}
        activeOrders={[]}
        pastOrders={[]}
        deliveryAddress={null}
        phone={null}
        votedFish={[]}
      />
    );
  }

  // ── Customer profile (delivery address) ───────────────────────────────────
  const { data: customer } = await supabase
    .from("customers")
    .select("id, delivery_address")
    .eq("user_id", dbUser.id)
    .maybeSingle();

  // ── Orders with items + fish names ─────────────────────────────────────────
  type RawOrderItem = {
    id: string;
    fish_species_id: string;
    quantity_kg: number;
    price_per_kg_aud_cents: number;
    fish_species: { id: string; name_fijian: string | null; name_english: string } | null;
  };

  type RawOrder = {
    id: string;
    status: string;
    total_aud_cents: number;
    placed_at: string;
    order_items: RawOrderItem[];
  };

  let activeOrders: AccountOrder[] = [];
  let pastOrders: AccountOrder[] = [];

  if (customer) {
    const { data: ordersData } = await supabase
      .from("orders")
      .select(`
        id,
        status,
        total_aud_cents,
        placed_at,
        order_items (
          id,
          fish_species_id,
          quantity_kg,
          price_per_kg_aud_cents,
          fish_species ( id, name_fijian, name_english )
        )
      `)
      .eq("customer_id", customer.id)
      .order("placed_at", { ascending: false });

    const orders = (ordersData ?? []) as unknown as RawOrder[];

    function mapOrder(raw: RawOrder): AccountOrder {
      const items: AccountOrderItem[] = (raw.order_items ?? []).map((oi) => ({
        id: oi.id,
        fish_species_id: oi.fish_species_id,
        fishName: oi.fish_species?.name_fijian ?? oi.fish_species?.name_english ?? "Fish",
        quantity_kg: Number(oi.quantity_kg),
        price_per_kg_aud_cents: oi.price_per_kg_aud_cents,
      }));
      return { id: raw.id, status: raw.status, total_aud_cents: raw.total_aud_cents, placed_at: raw.placed_at, items };
    }

    const HISTORY_STATUSES = ["delivered", "cancelled", "refunded"];
    activeOrders = orders.filter((o) => !HISTORY_STATUSES.includes(o.status)).map(mapOrder);
    pastOrders = orders.filter((o) => HISTORY_STATUSES.includes(o.status)).map(mapOrder);
  }

  // ── Fish votes ─────────────────────────────────────────────────────────────
  const { data: votes } = await supabase
    .from("fish_interest_votes")
    .select("fish_species_id")
    .eq("voter_clerk_id", userId);

  const votedFishIds = (votes ?? []).map((v: { fish_species_id: string }) => v.fish_species_id);

  let votedFish: VotedFish[] = [];
  if (votedFishIds.length > 0) {
    const { data: fishData } = await supabase
      .from("fish_species")
      .select("id, name_fijian, name_english")
      .in("id", votedFishIds);
    votedFish = (fishData ?? []) as VotedFish[];
  }

  return (
    <AccountContent
      email={email}
      fullName={fullName}
      activeOrders={activeOrders}
      pastOrders={pastOrders}
      deliveryAddress={customer?.delivery_address ?? null}
      phone={dbUser.phone ?? null}
      votedFish={votedFish}
    />
  );
}
