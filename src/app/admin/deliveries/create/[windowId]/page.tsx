export const dynamic = "force-dynamic";

import { createServerSupabaseClient } from "@/lib/supabase";
import { notFound } from "next/navigation";
import CreateRunForm, { type StopCandidate, type DriverOption } from "./CreateRunForm";

// ── Data fetching ─────────────────────────────────────────────────────────────

async function getWindowData(windowId: string) {
  const supabase = createServerSupabaseClient();

  const { data: window } = await supabase
    .from("flight_windows")
    .select("id, flight_number, flight_date, status")
    .eq("id", windowId)
    .single();

  return window;
}

async function getActiveDrivers(): Promise<DriverOption[]> {
  const supabase = createServerSupabaseClient();

  const { data } = await supabase
    .from("drivers")
    .select("id, vehicle_description, users:user_id(full_name)")
    .eq("is_active", true);

  return (data ?? []).map((d) => {
    const usersRaw = d.users as unknown;
    const userObj = Array.isArray(usersRaw) ? (usersRaw[0] ?? null) : usersRaw;
    return {
      id: d.id,
      full_name: (userObj as { full_name?: string | null } | null)?.full_name ?? "Unknown",
      vehicle_description: d.vehicle_description,
    };
  });
}

async function getPaidOrders(windowId: string): Promise<StopCandidate[]> {
  const supabase = createServerSupabaseClient();

  const { data: orders } = await supabase
    .from("orders")
    .select(`
      id, customer_id, delivery_address, delivery_notes, total_aud_cents,
      delivery_zone_id,
      order_items(quantity_kg, fish_species:fish_species_id(name_english)),
      customers(
        id,
        users:user_id(full_name, phone),
        delivery_zones:delivery_zone_id(id, name, state)
      )
    `)
    .eq("flight_window_id", windowId)
    .in("status", ["paid", "confirmed"])
    .is("delivery_run_id", null);

  if (!orders?.length) return [];

  // Normalise Supabase joins + build stop candidates
  const raw: {
    orderId: string;
    customerId: string;
    address: string | null;
    customerName: string;
    phone: string | null;
    zoneName: string;
    zoneState: string;
    totalAud: number;
    items: { kg: number; species: string }[];
    deliveryNotes: string | null;
  }[] = orders.map((o) => {
    const customersRaw = o.customers as unknown;
    const custObj = Array.isArray(customersRaw)
      ? (customersRaw[0] ?? null)
      : (customersRaw as { users?: unknown; delivery_zones?: unknown } | null);

    const usersRaw = (custObj as { users?: unknown } | null)?.users;
    const userObj = Array.isArray(usersRaw) ? (usersRaw[0] ?? null) : usersRaw;

    const zonesRaw = (custObj as { delivery_zones?: unknown } | null)?.delivery_zones;
    const zoneObj = Array.isArray(zonesRaw) ? (zonesRaw[0] ?? null) : zonesRaw;

    const itemsRaw = o.order_items as unknown;
    const itemsArr = Array.isArray(itemsRaw) ? itemsRaw : [];
    const items = itemsArr.map((item: { quantity_kg: number; fish_species?: unknown }) => {
      const fs = Array.isArray(item.fish_species) ? item.fish_species[0] : item.fish_species;
      return {
        kg: Number(item.quantity_kg),
        species: (fs as { name_english?: string } | null)?.name_english ?? "Fish",
      };
    });

    return {
      orderId: o.id,
      customerId: o.customer_id,
      address: o.delivery_address,
      customerName: (userObj as { full_name?: string | null } | null)?.full_name ?? "Unknown",
      phone: (userObj as { phone?: string | null } | null)?.phone ?? null,
      zoneName: (zoneObj as { name?: string } | null)?.name ?? "—",
      zoneState: (zoneObj as { state?: string } | null)?.state ?? "—",
      totalAud: o.total_aud_cents,
      items,
      deliveryNotes: o.delivery_notes,
    };
  });

  // Sort by state → zone name → address
  raw.sort((a, b) => {
    const s = a.zoneState.localeCompare(b.zoneState);
    if (s !== 0) return s;
    const z = a.zoneName.localeCompare(b.zoneName);
    if (z !== 0) return z;
    return (a.address ?? "").localeCompare(b.address ?? "");
  });

  // Group by address for communal detection
  // Generate a stable communal_group_id for each unique address that appears 2+ times
  const addressCounts: Record<string, string[]> = {};
  for (const o of raw) {
    const key = (o.address ?? "").trim().toLowerCase();
    if (!addressCounts[key]) addressCounts[key] = [];
    addressCounts[key].push(o.orderId);
  }

  // Build communal_group_id map: address → uuid (only for groups of 2+)
  const communalGroups: Record<string, string> = {};
  for (const [key, ids] of Object.entries(addressCounts)) {
    if (key && ids.length >= 2) {
      // Generate a deterministic group ID based on order IDs sorted
      communalGroups[key] = ids.sort().join("_").slice(0, 36);
    }
  }

  return raw.map((o, index) => {
    const key = (o.address ?? "").trim().toLowerCase();
    const groupId = key ? (communalGroups[key] ?? null) : null;
    const isCommunal = groupId !== null;

    return {
      orderId: o.orderId,
      customerId: o.customerId,
      address: o.address,
      customerName: o.customerName,
      phone: o.phone,
      zoneName: o.zoneName,
      zoneState: o.zoneState,
      totalAud: o.totalAud,
      items: o.items,
      deliveryNotes: o.deliveryNotes,
      sequenceNumber: index + 1,
      isCommunal,
      communalGroupId: groupId,
    };
  });
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function CreateDeliveryRunPage({
  params,
}: {
  params: Promise<{ windowId: string }>;
}) {
  const { windowId } = await params;
  const [window, drivers, stops] = await Promise.all([
    getWindowData(windowId),
    getActiveDrivers(),
    getPaidOrders(windowId),
  ]);

  if (!window) notFound();

  const dateLabel = new Date(window.flight_date + "T00:00:00").toLocaleDateString("en-AU", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <p className="text-xs font-mono text-text-secondary uppercase tracking-widest mb-1">Admin · Deliveries</p>
        <h1 className="text-2xl font-bold text-text-primary">Create Delivery Run</h1>
        <p className="text-text-secondary text-sm mt-1">
          {window.flight_number ?? "—"} · {dateLabel}
        </p>
      </div>

      <CreateRunForm
        windowId={windowId}
        drivers={drivers}
        initialStops={stops}
      />
    </div>
  );
}
