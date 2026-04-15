export const dynamic = "force-dynamic";

import { getSupabaseUser } from "@/lib/supabase-auth";
import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import DeliveryProofForm, { type StopData } from "./DeliveryProofForm";

async function getStopData(stopId: string): Promise<StopData> {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const supabase = await getSupabaseUser();

  const { data: raw } = await supabase
    .from("delivery_stops")
    .select(`
      id, order_id, sequence_number, address, status, is_communal, notes,
      orders(id, delivery_address, delivery_notes, total_aud_cents,
        order_items(quantity_kg, fish_species:fish_species_id(name_english))
      ),
      customers(users:user_id(full_name, phone))
    `)
    .eq("id", stopId)
    .single();

  if (!raw) notFound();

  // Normalize Supabase array relations to single objects
  const rawOrders = raw.orders as unknown;
  const rawCustomers = raw.customers as unknown;

  const orders = Array.isArray(rawOrders) ? (rawOrders[0] ?? null) : (rawOrders as StopData["orders"]);
  const customersRaw = Array.isArray(rawCustomers) ? (rawCustomers[0] ?? null) : rawCustomers;

  // Normalize nested fish_species arrays within order_items
  const normalizedOrders = orders
    ? {
        ...orders,
        order_items: (orders.order_items ?? []).map(
          (item: { quantity_kg: number; fish_species: unknown }) => ({
            quantity_kg: item.quantity_kg,
            fish_species: Array.isArray(item.fish_species)
              ? (item.fish_species[0] ?? null)
              : (item.fish_species as { name_english: string } | null),
          }),
        ),
      }
    : null;

  type UserShape = { full_name: string | null; phone: string | null };
  const normalizedCustomers: { users: UserShape | null } | null = customersRaw
    ? {
        users: (Array.isArray((customersRaw as { users: unknown }).users)
          ? ((customersRaw as { users: unknown[] }).users[0] ?? null)
          : (customersRaw as { users: UserShape | null }).users) as UserShape | null,
      }
    : null;

  return {
    id: raw.id,
    order_id: raw.order_id,
    sequence_number: raw.sequence_number,
    address: raw.address,
    status: raw.status,
    is_communal: raw.is_communal,
    notes: raw.notes,
    orders: normalizedOrders,
    customers: normalizedCustomers,
  };
}

export default async function DeliverStopPage({
  params,
}: {
  params: Promise<{ stopId: string }>;
}) {
  const { stopId } = await params;
  const stop = await getStopData(stopId);

  return (
    <div className="p-4 max-w-xl mx-auto">
      <div className="mb-6 pt-2">
        <p className="text-xs font-mono text-text-secondary uppercase tracking-widest mb-1">
          Stop #{stop.sequence_number}
        </p>
        <h1 className="text-2xl font-bold text-text-primary">Delivery Proof</h1>
      </div>

      <DeliveryProofForm stop={stop} />
    </div>
  );
}
