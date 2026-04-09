# FijiFish — Catch-to-Customer Seafood Platform

## What this is
Next.js webapp connecting Fijian fishing villages with buyers in Australia.
Real-time tracking from ocean to doorstep. Live scarcity (capacity + timer).
Multi-village supply network. WorldView HUD aesthetic.

## Stack
Next.js 16 (App Router), TypeScript, Clerk (auth, 4 roles),
Supabase (AU region, data + storage + realtime), Stripe, Tailwind CSS,
Mapbox GL JS (dark maps), Twilio (SMS/WhatsApp), Vercel.

## Status: Phase 0 — Foundation

## Source of truth: FIJIFISH-WEBAPP-SPEC-v3.md
Read this before building any feature. If spec and code disagree, spec wins.

## 4 user roles (Clerk)
- buyer: browse, order (AU only), track, rate
- supplier: per-village, catch photos, shipment status, season flags
- driver: delivery route, photo proof, communal handling
- admin: everything — prices, capacity, windows, villages, broadcasts, approvals

## Key domain rules
- Live scarcity: capacity bar (kg remaining) + countdown timer per flight window
- Purchase restricted to Australian users only (Stripe AUD)
- Overseas users see prices (FJD or AUD) but cannot checkout
- Dual pricing: AUD + FJD independent, no auto-conversion, admin sets both
- Multi-village: each village is a supply node, only sees own orders
- Catch photos: supplier uploads → admin approves → buyers notified with real photo
- 9-step shipment tracking with live flight embed (FlightRadar24)
- Driver: nearest-stop route optimisation, mandatory photo proof, communal detection
- Broadcasts: admin SMS/WhatsApp to customer segments, Spam Act 2003 compliant
- Village impact stories: public pages showing what revenue has funded

## Reference files
- FIJIFISH-WEBAPP-SPEC-v3.md — COMPLETE product spec
- src/lib/order-engine.ts — order window state machine
- src/lib/route-optimiser.ts — nearest-neighbour delivery routing
- src/lib/notifications.ts — central notification dispatcher
- src/lib/scarcity.ts — capacity tracking + realtime subscriptions
- supabase/migrations/ — schema source of truth

## Code standards
- TypeScript strict, no any
- Supabase RLS on all tables, Clerk userId from JWT
- All prices integer cents (price_aud_cents, price_fjd_cents)
- All capacity in decimal kg (total_capacity_kg, reserved_kg)
- Error handling on every API route
- Photo compression client-side to max 1MB
- Tests for: order engine, seasonal filter, route optimiser, price logic, capacity

## Red lines
- NEVER use Supabase Auth — all auth is Clerk
- NEVER auto-convert AUD to FJD — prices are independent
- NEVER allow non-AU users to reach Stripe checkout
- NEVER mark order delivered without photo proof
- NEVER show unapproved catch photos to buyers
- NEVER show one village's orders to another village's supplier
- NEVER expose customer data beyond what each role needs
- NEVER store payment card details
- NEVER use Supabase service key on client side
- NEVER use light theme except supplier portal
- NEVER send broadcast without opt-out mechanism
- NEVER skip Spam Act 2003 compliance on broadcasts

## At session start
1. Read CLAUDE.md and SESSIONS.md
2. Read FIJIFISH-WEBAPP-SPEC-v3.md if building a new feature
3. State current phase and next task
4. Load relevant skills before writing code

## At session end
Run /wrap-up

## Skills (12)
- /clerk-auth — roles, middleware, Supabase sync, village_id on suppliers
- /worldview-ui — dark HUD design system, colours, typography, components
- /order-window-logic — flight-driven state machine, scarcity mechanics
- /delivery-driver — route optimisation, photo proof, communal delivery
- /geo-pricing — AUD/FJD detection, AU-only purchase gate
- /photo-approval — catch photos + delivery proofs, Supabase Storage
- /notification-engine — Twilio SMS/WhatsApp triggers + broadcast system
- /flight-tracking — FlightRadar24 embed
- /supabase-migration — schema, RLS, naming conventions
- /stripe-checkout — payment, webhooks, refunds
- /seasonal-filter — month-range logic
- /fiji-compliance — BICON, export certs, cold chain
