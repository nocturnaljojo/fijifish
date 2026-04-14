/**
 * src/lib/flight-window-state.ts
 *
 * Pure, deterministic state machine for flight window status.
 *
 * STATE CATEGORIES:
 *
 * Time-driven (computed from timestamps — NEVER written to DB):
 *   upcoming     → now < order_open_at
 *   open         → now ≥ order_open_at AND (order_close_at − now) ≥ CLOSING_SOON_HOURS
 *   closing_soon → now ≥ order_open_at AND (order_close_at − now) < CLOSING_SOON_HOURS
 *   closed       → now ≥ order_close_at  (and no admin-driven state stored)
 *
 * Admin-driven (stored in DB, triggered by manual action):
 *   packing → delivered, cancelled
 */

import type { FlightWindow, FlightWindowStatus } from "@/types/database";

/** Hours before order_close_at at which the window enters 'closing_soon'. */
export const CLOSING_SOON_HOURS = 6;

/**
 * States that are set by admin action and stored in the DB.
 * If the DB holds one of these, trust it — don't override with time logic.
 */
const ADMIN_DRIVEN: ReadonlySet<FlightWindowStatus> = new Set([
  "packing",
  "shipped",
  "in_transit",
  "landed",
  "customs",
  "delivering",
  "delivered",
  "cancelled",
]);

/**
 * Compute the effective status of a flight window at a given moment.
 *
 * Pure function — same inputs → same output, no side effects.
 * Safe to call in both server and client contexts.
 *
 * @param window  A FlightWindow row (or subset with the required fields).
 * @param now     The reference time to evaluate against (pass `new Date()` in production).
 */
export function getFlightWindowStatus(
  window: Pick<FlightWindow, "order_open_at" | "order_close_at" | "status">,
  now: Date,
): FlightWindowStatus {
  const stored = window.status as FlightWindowStatus;

  // Admin-driven states are authoritative — skip time logic.
  if (ADMIN_DRIVEN.has(stored)) {
    return stored;
  }

  const nowMs = now.getTime();
  const openMs = new Date(window.order_open_at).getTime();
  const closeMs = new Date(window.order_close_at).getTime();
  const closingSoonMs = closeMs - CLOSING_SOON_HOURS * 60 * 60 * 1000;

  if (nowMs < openMs) return "upcoming";
  if (nowMs < closingSoonMs) return "open";
  if (nowMs < closeMs) return "closing_soon";
  return "closed";
}

/**
 * Returns true when buyers may place orders (open or closing_soon states).
 */
export function isOrderingOpen(status: FlightWindowStatus): boolean {
  return status === "open" || status === "closing_soon";
}
