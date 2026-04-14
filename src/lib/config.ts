/**
 * src/lib/config.ts
 * Single source of truth for all configurable values.
 *
 * When the admin panel is built, these values will come from inventory_availability
 * and flight_windows tables. Until then, change them HERE — not in individual components.
 */

// ── Site ───────────────────────────────────────────────────────────────────────

export const SITE_CONFIG = {
  name: "FijiFish",
  tagline: "Pacific Seafood — Wild-caught in Fiji, delivered to the Riverina.",
  url: process.env.NEXT_PUBLIC_APP_URL ?? "https://vitifish.vercel.app",
} as const;

// ── Delivery ──────────────────────────────────────────────────────────────────

export const DELIVERY_CONFIG = {
  /** Current live delivery zones */
  zones: [
    "Wagga Wagga",
    "Griffith",
    "Leeton",
    "Narrandera",
    "Canberra",
    "Goulburn",
    "Young",
    "Cowra",
    "Eden",
  ] as string[],
  anchorDay: "Thursday" as const,
  orderCloseDay: "Monday" as const,
  orderCloseTime: "11:59 PM AEST" as const,
  /** Registrations needed to unlock a new zone */
  zoneUnlockTarget: 20,
} as const;

// ── Current flight window (hardcoded until flight_windows is wired) ───────────

export const FLIGHT_CONFIG = {
  /**
   * UTC timestamp for when the current order window closes.
   * Replace with a live query to flight_windows.order_close_at in Phase 1b.
   */
  orderCloseAt: new Date("2026-04-15T13:59:00.000Z").getTime(),
  /** Human-readable delivery date shown in the banner */
  nextDeliveryLabel: "Thursday 17 Apr",
  /** Flight number shown on tracking page */
  flightNumber: "FJ911",
  /** Route shown to buyers */
  route: "Nadi → Sydney → Riverina",
} as const;

// ── Cargo / capacity (hardcoded until inventory_availability is wired) ────────

export const CARGO_CONFIG = {
  /**
   * Current cargo fill percentage (0–100).
   * Replace with a live query to inventory_availability in Phase 1b.
   */
  capacityPercent: 72,
  /** Total kg on this flight (used to calculate kg remaining) */
  totalKg: 100,
} as const;

// ── Pricing ───────────────────────────────────────────────────────────────────

export const PRICING_CONFIG = {
  currency: {
    au: { code: "AUD" as const, symbol: "A$", showDecimals: true },
    fj: { code: "FJD" as const, symbol: "FJ$", showDecimals: false },
  },
  /** Default price in AUD cents, shown when DB price not available */
  defaultPriceAudCents: 3500,
  /** Formatted default price label for static hero/CTA components. Derived from defaultPriceAudCents. */
  defaultPriceLabel: "A$35",
} as const;

// ── Thresholds (drive UI behaviour) ──────────────────────────────────────────

export const THRESHOLDS = {
  /** % full → amber urgency in banner and cards */
  cargoAlmostFull: 80,
  /** % full → red "Last spots!" label */
  cargoLastSpots: 95,
  /** % full → "Filling fast" label */
  cargoFillingFast: 50,
  /** hours remaining → show urgency banner */
  countdownUrgentHours: 12,
  /** hours remaining → start pulse animation on countdown */
  countdownPulseHours: 6,
  /** votes needed to add a new fish species */
  speciesVoteTarget: 30,
  /** registrations needed to unlock a delivery zone */
  zoneUnlockTarget: 20,
} as const;

// ── Billing ───────────────────────────────────────────────────────────────────

export const BILLING_CONFIG = {
  /**
   * Static URL from Stripe Dashboard → Settings → Billing → Customer portal.
   * Append `?prefilled_email=<email>` for a better UX.
   * Set STRIPE_PORTAL_URL in Vercel env vars (server-only — no NEXT_PUBLIC_ prefix).
   * If not set, a static "Contact us" fallback is shown.
   */
  stripePortalUrl: process.env.STRIPE_PORTAL_URL ?? null,
} as const;

// ── Social proof stats ────────────────────────────────────────────────────────

export const SOCIAL_PROOF_STATS = [
  { value: 47, suffix: "", label: "people registered" },
  { value: 8, suffix: "", label: "delivery zones" },
  { value: 3500, suffix: "km", label: "reef to door" },
] as const;
