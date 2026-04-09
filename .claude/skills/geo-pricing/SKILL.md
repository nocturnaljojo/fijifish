---
name: geo-pricing
description: Geo-based AUD/FJD price switching and AU-only purchase gate. Use when building price display or checkout.
allowed-tools: Read, Write, Grep
---

# Geo-Based Pricing

## CRITICAL RULES
1. NEVER auto-convert AUD↔FJD. Two independent prices set by admin.
2. NEVER floating point for money. Integer cents: price_aud_cents=4000 means $40.00.
3. NEVER show both currencies to same user. AU sees AUD, FJ sees FJD, others see AUD.
4. NEVER allow non-AU users to reach Stripe checkout.

## Detection priority:
1. Clerk profile country_code (set at onboarding) — most reliable
2. Browser locale (navigator.language)
3. Default: AUD

## Display: A$40.00 for AUD, FJ$12 for FJD (FJD shows whole dollars when possible)

## Purchase gate:
- AU users: full Stripe checkout in AUD
- FJ users: see FJD prices, "Contact us to order" + WhatsApp link (no Stripe)
- All others: see AUD prices (display only), "Available in Australia only"

## Prices stored independently on inventory_availability:
- price_aud_cents — admin sets based on margin
- price_fjd_cents — admin sets based on cousin's verbal update
- No conversion formula. They are different market prices.
