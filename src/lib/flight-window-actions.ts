"use server";

/**
 * src/lib/flight-window-actions.ts
 *
 * Admin server actions for manual flight window state transitions.
 *
 * Only admin-driven states are written to the DB (packing → delivered, cancelled).
 * Time-driven states (upcoming/open/closing_soon/closed) are computed at render time
 * by getFlightWindowStatus() and are NEVER written here.
 *
 * Each action:
 *   1. Validates the current effective state allows the transition.
 *   2. Updates flight_windows.status + status_updated_at.
 *   3. Returns the updated window row.
 *
 * NOTE: notification_log requires a customer_id (NOT NULL FK to customers).
 * Window-level state events don't have a single customer — bulk notifications
 * for buyers will be triggered by the notification engine (Phase 1b/2).
 */

import { createServerSupabaseClient } from "@/lib/supabase";
import { requireRole } from "@/lib/roles";
import { getFlightWindowStatus } from "@/lib/flight-window-state";
import type { FlightWindow, FlightWindowStatus } from "@/types/database";

// ── Internal helpers ──────────────────────────────────────────────────────────

async function fetchWindow(windowId: string): Promise<FlightWindow> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("flight_windows")
    .select("*")
    .eq("id", windowId)
    .single();

  if (error || !data) {
    throw new Error(`Flight window not found: ${windowId}`);
  }
  return data as FlightWindow;
}

async function applyTransition(
  windowId: string,
  targetStatus: FlightWindowStatus,
  allowedFrom: FlightWindowStatus[],
  extraUpdates?: Record<string, unknown>,
): Promise<FlightWindow> {
  await requireRole(["admin"]);

  const window = await fetchWindow(windowId);
  const current = getFlightWindowStatus(window, new Date());

  if (!allowedFrom.includes(current)) {
    throw new Error(
      `Cannot transition to '${targetStatus}' — window is currently '${current}'. ` +
        `Allowed from: ${allowedFrom.join(", ")}.`,
    );
  }

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("flight_windows")
    .update({
      status: targetStatus,
      status_updated_at: new Date().toISOString(),
      ...extraUpdates,
    })
    .eq("id", windowId)
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to transition window ${windowId} to '${targetStatus}': ${error?.message}`);
  }

  return data as FlightWindow;
}

// ── Admin-driven transitions ──────────────────────────────────────────────────

/**
 * closed → packing
 * Supplier is preparing the shipment. Admin triggers after order window closes.
 */
export async function markAsPacking(windowId: string): Promise<FlightWindow> {
  return applyTransition(windowId, "packing", ["closed"]);
}

/**
 * packing → shipped
 * Fish is on the plane. Optionally records the flight number.
 */
export async function markAsShipped(
  windowId: string,
  flightNumber?: string,
): Promise<FlightWindow> {
  return applyTransition(
    windowId,
    "shipped",
    ["packing"],
    flightNumber ? { flight_number: flightNumber } : undefined,
  );
}

/**
 * shipped → in_transit
 * Flight has departed Fiji; fish is in the air.
 */
export async function markAsInTransit(windowId: string): Promise<FlightWindow> {
  return applyTransition(windowId, "in_transit", ["shipped"]);
}

/**
 * shipped | in_transit → landed
 * Flight arrived at Canberra. Awaiting BICON customs inspection.
 */
export async function markAsLanded(windowId: string): Promise<FlightWindow> {
  return applyTransition(windowId, "landed", ["shipped", "in_transit"]);
}

/**
 * landed → customs
 * BICON inspection in progress / cleared.
 */
export async function markAsCustomsCleared(windowId: string): Promise<FlightWindow> {
  return applyTransition(windowId, "customs", ["landed"]);
}

/**
 * customs → delivering
 * Driver has picked up the fish; out for delivery.
 */
export async function markAsDelivering(windowId: string): Promise<FlightWindow> {
  return applyTransition(windowId, "delivering", ["customs"]);
}

/**
 * delivering → delivered
 * All orders in this window fulfilled. Triggers feedback prompt (Phase 2).
 */
export async function markAsDelivered(windowId: string): Promise<FlightWindow> {
  return applyTransition(windowId, "delivered", ["delivering"]);
}

/**
 * any state → cancelled
 * Admin cancels the window (bad weather, no catch, logistics failure, etc).
 * Cannot cancel a window that has already been delivered.
 *
 * @param reason  Optional cancellation reason stored in flight_windows.notes.
 */
export async function cancelWindow(
  windowId: string,
  reason?: string,
): Promise<FlightWindow> {
  await requireRole(["admin"]);

  const window = await fetchWindow(windowId);
  const current = getFlightWindowStatus(window, new Date());

  if (current === "delivered") {
    throw new Error("Cannot cancel a window that has already been delivered.");
  }

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("flight_windows")
    .update({
      status: "cancelled",
      status_updated_at: new Date().toISOString(),
      ...(reason !== undefined ? { notes: reason } : {}),
    })
    .eq("id", windowId)
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to cancel window ${windowId}: ${error?.message}`);
  }

  return data as FlightWindow;
}
