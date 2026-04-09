---
name: stripe-checkout
description: Stripe payment integration for fish orders. Use when building checkout flow, payment processing, refund handling, or webhook receivers. AU buyers only.
allowed-tools: Read, Grep
---

# Stripe Checkout

## CRITICAL RULES
1. ONLY Australian users can reach checkout. Check country_code before rendering Stripe components.
2. All prices in AUD cents (integer). $40.00 = 4000. NEVER floating point.
3. NEVER log full payment intent objects (contains sensitive data).
4. Webhook endpoint must return 200 quickly — do heavy processing async.

## Integration pattern
- Stripe Checkout (hosted) for MVP — minimal frontend code, PCI compliant out of the box
- Create Checkout Session server-side in API route
- Redirect customer to Stripe-hosted page
- Webhook receives payment confirmation
- Order status transitions from pending → confirmed → paid on successful payment

## Key fields
- line_items: one per fish species in order, with quantity_kg and price
- delivery fee as separate line item
- metadata: { order_id, customer_id, flight_window_id, village_id }

## Webhook handling (src/app/api/webhooks/stripe/route.ts)
- Verify webhook signature (STRIPE_WEBHOOK_SECRET)
- Handle: checkout.session.completed → mark order paid, reduce inventory available_kg
- Handle: charge.refunded → mark order refunded, restore available_kg
- Idempotent: check if order already paid before updating

## On successful payment:
- Order status → paid
- inventory_availability.reserved_kg increases by order quantity
- inventory_availability.available_kg decreases (auto-calculated)
- All connected browsers see capacity bar update via Supabase Realtime

## Refund scenarios
- Flight cancelled: full refund, admin triggers manually, capacity restored
- Partial availability: partial refund for unfilled items
- Quality issue on arrival: case-by-case, admin triggers

## Gotchas
- Test with Stripe CLI: stripe listen --forward-to localhost:3000/api/webhooks/stripe
- Stripe account already exists (sole trader, ABN registered)
- Webhook must handle duplicate events (Stripe retries on timeout)
- NEVER process refunds automatically — always admin-initiated
