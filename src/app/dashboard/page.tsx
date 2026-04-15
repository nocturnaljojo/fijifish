/**
 * /dashboard — My Orders
 * Server component: fetches all orders for the authenticated buyer.
 *
 * Query path: Clerk userId → users.clerk_id → customers.user_id → orders.customer_id
 * RLS enforcement: user client passes Clerk JWT → auth.jwt()->>'sub' matches users.clerk_id.
 */

export const dynamic = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getSupabaseUser } from "@/lib/supabase-auth";
import { getFlightWindowStatus } from "@/lib/flight-window-state";
import OrderCard, { type DashboardOrder } from "@/components/dashboard/OrderCard";
import type { FlightWindowStatus } from "@/types/database";

// ── Data fetching ─────────────────────────────────────────────────────────────

type RawOrderItem = {
  id: string;
  fish_species_id: string;
  quantity_kg: number;
  price_per_kg_aud_cents: number;
  fish_species: { id: string; name_fijian: string | null; name_english: string } | null;
};

type RawDeliveryZone = { name: string; state: string | null } | null;

type RawFlightWindow = {
  id: string;
  flight_date: string;
  flight_number: string | null;
  status: string;
  order_open_at: string;
  order_close_at: string;
} | null;

type RawOrder = {
  id: string;
  status: string;
  total_aud_cents: number;
  placed_at: string;
  delivery_address: string | null;
  delivery_notes: string | null;
  order_items: RawOrderItem[];
  delivery_zones: RawDeliveryZone;
  flight_windows: RawFlightWindow;
};

async function fetchOrders(userId: string): Promise<DashboardOrder[]> {
  const supabase = await getSupabaseUser();

  // Step 1: resolve DB user id
  const { data: dbUser } = await supabase
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .maybeSingle();

  if (!dbUser) return [];

  // Step 2: resolve customer id
  const { data: customer } = await supabase
    .from("customers")
    .select("id")
    .eq("user_id", dbUser.id)
    .maybeSingle();

  if (!customer) return [];

  // Step 3: fetch all orders with nested relations
  const { data: ordersData, error } = await supabase
    .from("orders")
    .select(`
      id,
      status,
      total_aud_cents,
      placed_at,
      delivery_address,
      delivery_notes,
      delivery_zones ( name, state ),
      flight_windows ( id, flight_date, flight_number, status, order_open_at, order_close_at ),
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

  if (error || !ordersData) return [];

  const now = new Date();

  return (ordersData as unknown as RawOrder[]).map((raw): DashboardOrder => {
    const zone = raw.delivery_zones;
    const fw = raw.flight_windows;

    // Compute effective window status via state machine
    const windowStatus: FlightWindowStatus | null = fw
      ? getFlightWindowStatus(
          {
            order_open_at: fw.order_open_at,
            order_close_at: fw.order_close_at,
            status: fw.status as FlightWindowStatus,
          },
          now,
        )
      : null;

    return {
      id: raw.id,
      status: raw.status,
      total_aud_cents: raw.total_aud_cents,
      placed_at: raw.placed_at,
      delivery_address: raw.delivery_address,
      delivery_notes: raw.delivery_notes,
      zone_name: zone?.name ?? null,
      zone_state: zone?.state ?? null,
      items: (raw.order_items ?? []).map((oi) => ({
        id: oi.id,
        fish_species_id: oi.fish_species_id,
        fishName:
          oi.fish_species?.name_fijian ??
          oi.fish_species?.name_english ??
          "Fish",
        quantity_kg: Number(oi.quantity_kg),
        price_per_kg_aud_cents: oi.price_per_kg_aud_cents,
      })),
      window: fw
        ? {
            id: fw.id,
            flight_date: fw.flight_date,
            flight_number: fw.flight_number,
            db_status: windowStatus ?? fw.status, // pass computed status for display
            order_open_at: fw.order_open_at,
            order_close_at: fw.order_close_at,
          }
        : null,
    };
  });
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in?redirect_url=/dashboard");

  const orders = await fetchOrders(userId);

  const activeOrders = orders.filter(
    (o) => !["delivered", "cancelled", "refunded"].includes(o.status),
  );
  const pastOrders = orders.filter((o) =>
    ["delivered", "cancelled", "refunded"].includes(o.status),
  );

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 sm:py-10">

      {/* Page heading */}
      <div className="mb-6">
        <p className="text-[10px] font-mono text-ocean-teal uppercase tracking-widest mb-1">
          Dashboard
        </p>
        <h1 className="text-2xl font-bold text-text-primary">My Orders</h1>
      </div>

      {orders.length === 0 ? (
        /* ── Empty state ────────────────────────────────────────────────── */
        <div className="py-20 text-center border border-white/10 rounded-2xl bg-white/[0.02]">
          <span className="text-5xl block mb-4" aria-hidden="true">🐟</span>
          <p className="text-text-primary font-semibold text-lg mb-2">No orders yet</p>
          <p className="text-text-secondary text-sm max-w-xs mx-auto mb-6">
            Browse what&apos;s fresh and place your first order from the Fijian reefs.
          </p>
          <Link
            href="/#fish-grid"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-ocean-teal text-bg-primary font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            Browse Fresh Fish →
          </Link>
        </div>
      ) : (
        <>
          {/* ── Active orders ─────────────────────────────────────────────── */}
          {activeOrders.length > 0 && (
            <section className="mb-8">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-mono text-text-secondary uppercase tracking-widest">
                  Active
                </h2>
                <span className="text-xs font-mono text-ocean-teal">
                  {activeOrders.length} order{activeOrders.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="space-y-3">
                {activeOrders.map((order) => (
                  <OrderCard key={order.id} order={order} />
                ))}
              </div>
            </section>
          )}

          {/* ── Past orders ───────────────────────────────────────────────── */}
          {pastOrders.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-mono text-text-secondary uppercase tracking-widest">
                  History
                </h2>
                <span className="text-xs font-mono text-text-secondary">
                  {pastOrders.length} order{pastOrders.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="space-y-3">
                {pastOrders.map((order) => (
                  <OrderCard key={order.id} order={order} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
