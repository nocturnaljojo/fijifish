export const dynamic = "force-dynamic";

import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase";
import OrdersTable, { type AdminOrderRow } from "./OrdersTable";
import WindowSelect from "./WindowSelect";
import type { OrderStatus } from "@/types/database";

const ORDER_STATUSES: OrderStatus[] = [
  "pending",
  "confirmed",
  "paid",
  "payment_failed",
  "out_for_delivery",
  "delivered",
  "cancelled",
  "refunded",
];

type RawOrderRow = {
  id: string;
  status: string;
  total_aud_cents: number;
  delivery_fee_aud_cents: number;
  placed_at: string;
  delivery_address: string | null;
  delivery_notes: string | null;
  stripe_payment_intent_id: string | null;
  flight_window_id: string;
  delivery_zone_id: string;
  customers: { full_name: string | null; email: string; phone: string | null } | null;
  flight_windows: { flight_date: string; flight_number: string | null } | null;
  delivery_zones: { name: string } | null;
};

type RawItemRow = {
  id: string;
  order_id: string;
  quantity_kg: number;
  price_per_kg_aud_cents: number;
  fish_species: { name_fijian: string | null; name_english: string } | null;
  villages: { name: string } | null;
};

async function getOrders(status?: string, windowId?: string): Promise<AdminOrderRow[]> {
  try {
    const supabase = createServerSupabaseClient();

    let query = supabase
      .from("orders")
      .select(`
        id, status, total_aud_cents, delivery_fee_aud_cents, placed_at,
        delivery_address, delivery_notes, stripe_payment_intent_id,
        flight_window_id, delivery_zone_id,
        customers:customer_id ( full_name, email, phone ),
        flight_windows:flight_window_id ( flight_date, flight_number ),
        delivery_zones:delivery_zone_id ( name )
      `)
      .order("placed_at", { ascending: false });

    if (status && ORDER_STATUSES.includes(status as OrderStatus)) {
      query = query.eq("status", status);
    }
    if (windowId) {
      query = query.eq("flight_window_id", windowId);
    }

    const { data: orderRows } = await query;
    if (!orderRows || orderRows.length === 0) return [];

    const orderIds = orderRows.map((r) => r.id);

    // Fetch all items for these orders in one query
    const { data: itemRows } = await supabase
      .from("order_items")
      .select(`
        id, order_id, quantity_kg, price_per_kg_aud_cents,
        fish_species:fish_species_id ( name_fijian, name_english ),
        villages:village_id ( name )
      `)
      .in("order_id", orderIds);

    // Group items by order_id
    const itemsByOrder: Record<string, RawItemRow[]> = {};
    for (const item of (itemRows ?? []) as unknown as RawItemRow[]) {
      if (!itemsByOrder[item.order_id]) itemsByOrder[item.order_id] = [];
      itemsByOrder[item.order_id].push(item);
    }

    return (orderRows as unknown as RawOrderRow[]).map((r) => ({
      id: r.id,
      status: r.status,
      total_aud_cents: r.total_aud_cents,
      delivery_fee_aud_cents: r.delivery_fee_aud_cents,
      placed_at: r.placed_at,
      delivery_address: r.delivery_address,
      delivery_notes: r.delivery_notes,
      stripe_payment_intent_id: r.stripe_payment_intent_id,
      customer: r.customers,
      flight_window: r.flight_windows,
      delivery_zone: r.delivery_zones,
      items: (itemsByOrder[r.id] ?? []).map((item) => ({
        id: item.id,
        quantity_kg: Number(item.quantity_kg),
        price_per_kg_aud_cents: item.price_per_kg_aud_cents,
        fish_species: item.fish_species,
        village: item.villages,
      })),
    }));
  } catch {
    return [];
  }
}

async function getWindowOptions() {
  try {
    const supabase = createServerSupabaseClient();
    const { data } = await supabase
      .from("flight_windows")
      .select("id, flight_date, flight_number")
      .order("flight_date", { ascending: false })
      .limit(20);
    return data ?? [];
  } catch {
    return [];
  }
}

async function getStatusCounts() {
  try {
    const supabase = createServerSupabaseClient();
    const { data } = await supabase.from("orders").select("status");
    const counts: Record<string, number> = {};
    for (const row of data ?? []) {
      counts[row.status] = (counts[row.status] ?? 0) + 1;
    }
    return counts;
  } catch {
    return {};
  }
}

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; window?: string }>;
}) {
  const { status, window: windowId } = await searchParams;

  const [orders, windows, statusCounts] = await Promise.all([
    getOrders(status, windowId),
    getWindowOptions(),
    getStatusCounts(),
  ]);

  const totalOrders = Object.values(statusCounts).reduce((a, b) => a + b, 0);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <p className="text-xs font-mono text-text-secondary uppercase tracking-widest mb-1">Admin</p>
        <h1 className="text-2xl font-bold text-text-primary">Orders</h1>
        <p className="text-text-secondary text-sm mt-1">
          {totalOrders} total order{totalOrders !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        {/* Status filter */}
        <div className="flex flex-wrap gap-1.5">
          <Link
            href="/admin/orders"
            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors ${
              !status
                ? "bg-ocean-teal/15 border border-ocean-teal/40 text-ocean-teal"
                : "bg-white/5 border border-white/10 text-text-secondary hover:text-text-primary"
            }`}
          >
            All ({totalOrders})
          </Link>
          {ORDER_STATUSES.filter((s) => statusCounts[s] > 0).map((s) => (
            <Link
              key={s}
              href={`/admin/orders?status=${s}${windowId ? `&window=${windowId}` : ""}`}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors ${
                status === s
                  ? "bg-ocean-teal/15 border border-ocean-teal/40 text-ocean-teal"
                  : "bg-white/5 border border-white/10 text-text-secondary hover:text-text-primary"
              }`}
            >
              {s} ({statusCounts[s]})
            </Link>
          ))}
        </div>

        {/* Window filter */}
        {windows.length > 0 && (
          <div className="ml-auto">
            <WindowSelect
              windows={windows}
              selected={windowId ?? ""}
              statusParam={status}
            />
          </div>
        )}
      </div>

      <OrdersTable orders={orders} />
    </div>
  );
}
