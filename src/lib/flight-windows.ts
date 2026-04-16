/**
 * src/lib/flight-windows.ts
 * Server-side helpers for querying the active flight window and inventory.
 * Uses createPublicSupabaseClient() — safe for public pages.
 */

import { createPublicSupabaseClient } from "./supabase";

export interface ShoppableWindowResult {
  /** The window buyers should order against right now, or null if none scheduled. */
  window: ActiveWindowData | null;
  /** True when the window is upcoming (not yet open) — pre-order mode. */
  isPreOrderMode: boolean;
}

export interface ActiveWindowData {
  id: string;
  flight_date: string;
  flight_number: string | null;
  order_close_at: string;
  order_open_at: string;
  status: string;
  notes: string | null;
}

export interface InventoryRow {
  fish_species_id: string;
  total_capacity_kg: number;
  reserved_kg: number;
  available_kg: number;
  price_aud_cents: number;
  price_fjd_cents: number;
}

/**
 * Returns the shoppable window — the window buyers should order against right now.
 *
 * Priority:
 *   1. A currently-open window (order_open_at in past, order_close_at in future) → normal mode
 *   2. The next upcoming window (order_open_at in future) → pre-order mode
 *   3. null → no scheduled window; show email capture
 *
 * Uses timestamp logic so it's independent of whatever status value the DB holds.
 */
export async function getShoppableWindow(): Promise<ShoppableWindowResult> {
  try {
    const supabase = createPublicSupabaseClient();
    const now = new Date().toISOString();

    // 1. Currently-open window: opened but not yet closed, not admin-advanced to packing+
    const { data: openWindow } = await supabase
      .from("flight_windows")
      .select("id, flight_date, flight_number, order_close_at, order_open_at, status, notes")
      .lte("order_open_at", now)
      .gt("order_close_at", now)
      .neq("status", "packing")
      .neq("status", "shipped")
      .neq("status", "in_transit")
      .neq("status", "landed")
      .neq("status", "customs")
      .neq("status", "delivering")
      .neq("status", "delivered")
      .neq("status", "cancelled")
      .order("order_close_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (openWindow) {
      return { window: openWindow as ActiveWindowData, isPreOrderMode: false };
    }

    // 2. Next upcoming window: not yet open, not cancelled/delivered
    const { data: upcomingWindow } = await supabase
      .from("flight_windows")
      .select("id, flight_date, flight_number, order_close_at, order_open_at, status, notes")
      .gt("order_open_at", now)
      .neq("status", "delivered")
      .neq("status", "cancelled")
      .order("order_open_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (upcomingWindow) {
      return { window: upcomingWindow as ActiveWindowData, isPreOrderMode: true };
    }

    return { window: null, isPreOrderMode: false };
  } catch {
    return { window: null, isPreOrderMode: false };
  }
}

/**
 * Returns the next active flight window (open, closing_soon, or upcoming).
 * Returns null if no active window exists — callers should fall back to config values.
 */
export async function getActiveFlightWindow(): Promise<ActiveWindowData | null> {
  try {
    const supabase = createPublicSupabaseClient();
    const { data } = await supabase
      .from("flight_windows")
      .select("id, flight_date, flight_number, order_close_at, order_open_at, status, notes")
      .in("status", ["open", "closing_soon", "upcoming"])
      .order("order_close_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    return data ?? null;
  } catch {
    return null;
  }
}

/**
 * Returns all inventory_availability rows for a given flight window.
 * Used to get real prices and capacity per species.
 */
export async function getWindowInventory(windowId: string): Promise<InventoryRow[]> {
  try {
    const supabase = createPublicSupabaseClient();
    const { data } = await supabase
      .from("inventory_availability")
      .select(
        "fish_species_id, total_capacity_kg, reserved_kg, available_kg, price_aud_cents, price_fjd_cents",
      )
      .eq("flight_window_id", windowId);
    return (data ?? []) as InventoryRow[];
  } catch {
    return [];
  }
}

/**
 * Calculates overall cargo fill % for a window.
 * Returns null if no inventory data exists.
 */
export function calcCargoPercent(inventory: InventoryRow[]): number | null {
  if (inventory.length === 0) return null;
  const totalCapacity = inventory.reduce((sum, r) => sum + Number(r.total_capacity_kg), 0);
  if (totalCapacity === 0) return null;
  const totalReserved = inventory.reduce((sum, r) => sum + Number(r.reserved_kg), 0);
  return Math.round((totalReserved / totalCapacity) * 100);
}

/**
 * Formats a flight_date string (YYYY-MM-DD) as a human label like "Thursday 17 Apr".
 */
export function formatFlightDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "short",
  });
}
