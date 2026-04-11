# FijiFish — Catch-to-Customer Seafood Platform

## What this is
Next.js webapp connecting Fijian fishing villages with buyers in Australia.
Real-time tracking from ocean to doorstep. Live scarcity (capacity + timer).
Multi-village supply network. WorldView HUD aesthetic.

## Stack
Next.js 16 (App Router), TypeScript, Clerk (auth, 4 roles),
Supabase (AU region, data + storage + realtime), Stripe, Tailwind CSS,
Mapbox GL JS (dark maps), Twilio (SMS/WhatsApp), Vercel.

## Status: Phase 1b — Core features

## Source of truth: FIJIFISH-WEBAPP-SPEC-v3.md
Read this before building any feature. If spec and code disagree, spec wins.

## Mandatory workflow — NO EXCEPTIONS
1. ALWAYS read CLAUDE.md, SESSIONS.md, and FIJIFISH-WEBAPP-SPEC-v3.md before writing any code
2. State current phase, what was last built, known issues, and next task before starting
3. ALWAYS update SESSIONS.md after completing any task
4. ALWAYS update FIJIFISH-WEBAPP-SPEC-v3.md if any features changed
5. ALWAYS commit with descriptive messages after each task
6. ALWAYS push to main after commits
7. NEVER start coding without completing steps 1–2

## At session start
1. Read CLAUDE.md, SESSIONS.md, FIJIFISH-WEBAPP-SPEC-v3.md, STATUS.md
2. State: current phase, last built, known issues, next task
3. Load relevant skills before writing code

## At session end
Run /wrap-up

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

## Supabase client pattern (CRITICAL)
Three clients in src/lib/supabase.ts:
- `createPublicSupabaseClient()` — anon key, for ALL public server components (page.tsx, ImpactFeed, catch pages). Use this for any page that fetches public data. Does NOT require SUPABASE_SERVICE_ROLE_KEY.
- `createBrowserSupabaseClient()` — anon key, for client components
- `createServerSupabaseClient()` — service role key, BYPASSES RLS. Reserved for admin API routes and Clerk webhooks ONLY. Will throw and cause silent failures on public pages if SUPABASE_SERVICE_ROLE_KEY is not set in Vercel.

NEVER use createServerSupabaseClient() in public page components. This was the root cause of the empty fish grid bug.

## Reference files
- FIJIFISH-WEBAPP-SPEC-v3.md — COMPLETE product spec
- STATUS.md — live components, routes, tables, what's built vs not
- src/lib/supabase.ts — three Supabase clients (public/browser/server)
- src/lib/roles.ts — server-side role helpers (getUserRole, requireRole, getVillageId)
- src/lib/roles-client.ts — client-side useRole() hook
- src/lib/pricing.ts — AUD/FJD dual currency logic
- src/proxy.ts — role-based middleware (admin/supplier/driver route protection)
- supabase/migrations/ — schema source of truth (001–005, 007–008; 006 skipped)
- NOT YET BUILT: src/lib/order-engine.ts, src/lib/route-optimiser.ts, src/lib/notifications.ts, src/lib/scarcity.ts

## Code standards
- TypeScript strict, no any
- Supabase RLS on all tables, Clerk userId from JWT
- All prices integer cents (price_aud_cents, price_fjd_cents)
- All capacity in decimal kg (total_capacity_kg, reserved_kg)
- Error handling on every API route
- Photo compression client-side to max 1MB
- Tests for: order engine, seasonal filter, route optimiser, price logic, capacity

## Architecture patterns
- All configurable values → `src/lib/config.ts` — NEVER hardcode in components
- All database types → `src/types/database.ts` — NEVER define inline
- All API routes → use `withErrorHandling` from `src/lib/api-helpers.ts`
- Public page queries → `createPublicSupabaseClient()` — NEVER service role
- Admin API routes → `createServerSupabaseClient()` after `requireAdmin()` check
- Components receive data via props from page.tsx — NEVER fetch inside components (except client-side interactions like voting)
- Before EVERY commit → run the `/pre-commit` skill checklist

## Regression prevention
- NEVER delete a working component without checking all imports first
- NEVER modify a component's props without checking all parents that pass those props
- NEVER change a Supabase table without checking all queries that reference it
- When fixing a bug, ask: "what else uses this code?" before changing it
- After any change to page.tsx, verify the fish grid still renders on localhost:3000

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
- NEVER use createServerSupabaseClient() in public page components

## Skills (14)
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
- /qa-playwright — Playwright browser testing against the live app
- /pre-commit — checklist to run before every commit (types, lint, build, docs)
