/**
 * Dual-currency pricing — AUD for Australian users, FJD for everyone else.
 *
 * CRITICAL RULES:
 * - NEVER auto-convert AUD↔FJD. They are independently-set prices.
 * - NEVER show both currencies to the same user.
 * - NEVER allow non-AU users to reach Stripe checkout.
 * - All prices stored as integer cents (price_aud_cents, price_fjd_cents).
 */

export type PriceDisplay = {
  amount: string;
  currency: "AUD" | "FJD";
  canCheckout: boolean;
  /** Shown instead of Add to Order button for non-AU users */
  unavailableMessage: string | null;
};

/**
 * Returns true if the given country code is Australia.
 * Detection priority (call site decides): Clerk profile → browser locale → default non-AU.
 */
export function isAustralian(countryCode: string | null | undefined): boolean {
  return countryCode === "AU";
}

/**
 * Returns the price display for a given user location.
 *
 * @param priceAudCents  - AUD price in cents (admin-set, integer)
 * @param priceFjdCents  - FJD price in cents (admin-set, integer)
 * @param countryCode    - Detected country code (AU / FJ / null / other)
 */
export function getDisplayPrice(
  priceAudCents: number,
  priceFjdCents: number,
  countryCode: string | null | undefined,
): PriceDisplay {
  if (isAustralian(countryCode)) {
    return {
      amount: formatAud(priceAudCents),
      currency: "AUD",
      canCheckout: true,
      unavailableMessage: null,
    };
  }

  if (countryCode === "FJ") {
    return {
      amount: formatFjd(priceFjdCents),
      currency: "FJD",
      canCheckout: false,
      unavailableMessage: "Contact us to order from Fiji",
    };
  }

  // All other countries: show AUD display price, no checkout
  return {
    amount: formatAud(priceAudCents),
    currency: "AUD",
    canCheckout: false,
    unavailableMessage: "Available for delivery in Australia only",
  };
}

function formatAud(cents: number): string {
  const dollars = cents / 100;
  return `A$${dollars % 1 === 0 ? dollars.toFixed(0) : dollars.toFixed(2)}`;
}

function formatFjd(cents: number): string {
  // FJD shown as whole dollars when possible
  const dollars = Math.round(cents / 100);
  return `FJ$${dollars}`;
}

/**
 * Detect country from Clerk publicMetadata (server-side use).
 * Returns null if not determinable.
 */
export function detectCountryFromClerk(
  publicMetadata: Record<string, unknown> | null | undefined,
): string | null {
  const cc = publicMetadata?.country_code;
  return typeof cc === "string" ? cc.toUpperCase() : null;
}

/**
 * Detect country from browser locale string (client-side fallback).
 * navigator.language "en-AU" → "AU", "en-FJ" → "FJ", etc.
 * Returns null if not determinable.
 */
export function detectCountryFromLocale(
  locale: string | null | undefined,
): string | null {
  if (!locale) return null;
  const parts = locale.split("-");
  if (parts.length >= 2) {
    const cc = parts[parts.length - 1].toUpperCase();
    // Only return well-known 2-letter codes
    if (/^[A-Z]{2}$/.test(cc)) return cc;
  }
  return null;
}
