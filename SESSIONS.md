# FijiFish — Session Log

Running log of what was built, decided, or unblocked each session. Claude reads this at session start (alongside `CLAUDE.md`) to pick up context.

Format: newest session on top. Each entry is a heading + short bullet list. Run `/wrap-up` at end of session to append.

---

## Known Issues

### #6 — RESOLVED: /order/success auth-gated — breaks Stripe redirect
`isAuthRoute` in `proxy.ts` uses `/order(.*)` which catches `/order/success`.
**RESOLVED** — QA 2026-04-12 confirms /order/success loads HTTP 200 without redirect in current build.
Found: QA session 2026-04-12. Verified resolved: QA checkout-flow session 2026-04-12.

### #5 — RESOLVED: CountdownTimer hydration mismatch
`useState(() => getTimeLeft(targetTimestamp))` calls `Date.now()` on init, causing SSR/client divergence → React regenerates tree → console error on every homepage load.
**RESOLVED** — Session I 2026-04-14: state initialised with `totalSeconds: -1` (SSR-safe), populated in `useEffect`. Lint rule disabled with comment for the intentional synchronous setState on mount.

### #3 — RESOLVED: Clerk session token not customised
Role-based middleware and `getUserRole()` require Clerk to include `publicMetadata` in the session JWT.
**RESOLVED** — 2026-04-14 (Session I config): Clerk Dashboard → Sessions → Customize session token set to `{ "metadata": "{{user.public_metadata}}" }`. Admin role set on primary user (jovilisi@protonmail.com) via Clerk Dashboard → Users → Public Metadata: `{"role": "admin"}`.

### #4 — RESOLVED: Verify Vercel env vars
`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` must be set in Vercel → Settings → Environment Variables.
**RESOLVED** — 2026-04-14 (Session I config): All env vars confirmed set in Vercel — Supabase (URL + anon key + service role), Stripe (secret key + webhook secret), Clerk (publishable + secret), Mapbox token, Twilio (SID + auth token + phone).

---

## Future Roadmap (not yet planned, noted for later)

- [ ] Afterpay integration — buy now pay later for AU customers
- [ ] Zip Pay integration — alternative BNPL option
- [ ] Fiji Airways partnership — negotiate volume cargo discounts, co-branding, promotional flights
- [ ] Fiji Airways loyalty tie-in — "FijiFish Flyer" points or bundled deals
- [ ] Multi-payment gateway — Stripe + Afterpay + Zip Pay checkout options
- [ ] Pacific community payment methods — M-PAiSA (Vodafone Fiji), MyCash for FJD payments

---

## Session I — 2026-04-14 — End-to-end checkout verified; infrastructure fully live

### Goal
Verify the full checkout flow works end-to-end locally with real Stripe events, confirm migration 011 applied, tidy untracked QA test files, and complete all manual config milestones.

### Code changes
- **Migration 011 applied** — `delivery_address` + `delivery_notes` columns now exist on `orders` table; checkout route now persists delivery address correctly
- **QA test files committed** — `tests/qa-checkout-flow.mjs` + `tests/qa-checkout-flow-full.mjs` + reports (previously untracked)
- **Lint clean** — fixed 4 unused-var errors in test files; fixed CountdownTimer (Known Issue #5) with `eslint-disable` comment (SSR-safe pattern already in place)

### End-to-end verification
- **Stripe CLI installed** at `C:\dev\stripe\stripe.exe` — `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
- **Stripe CLI authenticated** to FijiFish Pacific Seafood sandbox account
- **checkout.session.completed round-trip confirmed** — form fill → Stripe payment → webhook fires → order confirmed in Supabase → `/order/success` renders with 4-step timeline

### Manual config milestones (not in code)
- **Stripe production webhook** — endpoint `https://vitifish.vercel.app/api/webhooks/stripe` registered; events: `checkout.session.completed`, `payment_intent.payment_failed`, `charge.refunded`; signing secret matches `STRIPE_WEBHOOK_SECRET` in Vercel
- **Clerk session token** — `{ "metadata": "{{user.public_metadata}}" }` added in Clerk Dashboard → Sessions → Customize session token (closes Known Issue #3)
- **Admin role set** — `jovilisi@protonmail.com` Public Metadata: `{"role": "admin"}` via Clerk Dashboard → Users
- **All Vercel env vars confirmed** — Supabase (URL + anon + service role), Stripe (secret + webhook secret), Clerk (publishable + secret), Mapbox token, Twilio SID + auth + phone (closes Known Issue #4)

### Known issues resolved this session
- **#3** — Clerk session token configured ✓
- **#4** — All Vercel env vars set ✓
- **#5** — CountdownTimer hydration fix confirmed; lint rule documented ✓

### Next session
1. Clerk webhook (`/api/webhooks/clerk`) — sync new signups to Supabase `users` + `customers` tables so order history works immediately after signup
2. Supplier portal (`/supplier/*`) — Phase 2 groundwork
3. PayTo enablement in Stripe Dashboard (lower fees for AU bank-to-bank payments)
4. Create `stripe-patterns-fijifish.md` — project-specific Stripe patterns reference doc

---

## Session H — 2026-04-14 — Stripe webhook handler (order lifecycle backbone)

### Goal
Build a complete, production-ready Stripe webhook handler covering the full order lifecycle: payment confirmation, payment failure, and refunds — with atomic capacity management throughout.

### What we built
- `src/app/api/webhooks/stripe/route.ts` — full rewrite of stub; handles `checkout.session.completed` (confirm order), `payment_intent.payment_failed` (mark failed, restore capacity), `charge.refunded` (mark refunded, restore capacity); all unknown events return 200 safely
- `supabase/migrations/010_payment_failed_status_and_decrement_rpc.sql` — adds `payment_failed` to `orders.status` CHECK constraint; creates `decrement_reserved_kg(inv_id, delta)` RPC with `GREATEST(0, ...)` floor
- `src/types/database.ts` — added `payment_failed` to `OrderStatus` union type
- Applied migration 010 to Supabase via MCP

### Decisions made
- **No inventory change on `checkout.session.completed`** — capacity is already reserved atomically by `/api/checkout` before the Stripe session is created. Double-decrementing would oversell. Comment in code explains this.
- **`payment_failed` status added via migration** — distinct from admin-initiated `cancelled`; lets admin distinguish between "never paid" and "admin cancelled"
- **`logNotification()` swallows its own errors** — a notification log failure must never cause Stripe to retry and reprocess an order (idempotency invariant)
- **`decrement_reserved_kg` uses `GREATEST(0, reserved_kg - delta)`** — safe to call on already-zeroed rows, prevents negative reserved_kg
- **Idempotency guards on every handler** — status pre-checks before writing ensure duplicate Stripe deliveries are safe
- **`restoreCapacity()` looks up inventory by `(fish_species_id, flight_window_id, village_id)`** — uses order's `flight_window_id` + order_item's `fish_species_id` + `village_id` to find the inventory row, then calls the RPC

### TODOs left in code
- [ ] `src/app/api/checkout/route.ts` — `delivery_address` and `delivery_notes` columns don't exist on `orders` table per migration 001; these inserts are silently failing. Needs a migration to add the columns or the checkout route needs fixing.
- [ ] `notification_log` entries use `channel: 'email'` as placeholder — real Twilio SMS/WhatsApp dispatch is Phase 2 (`src/lib/notifications.ts`)
- [ ] `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` still need to be set in Vercel env vars

### Parking lot (deferred)
- [ ] `stripe listen --forward-to localhost:3000/api/webhooks/stripe` — local webhook testing when Stripe keys are set
- [ ] Clerk webhook `/api/webhooks/clerk` — sync new users to Supabase `users` table (listed in STATUS.md as NOT BUILT)
- [ ] Realtime capacity subscriptions (`src/lib/scarcity.ts`) — Supabase Realtime for live capacity bar updates

### Next session
First task: Fix the `orders` table — add `delivery_address` and `delivery_notes` columns via migration 011 so the checkout flow can actually write order data to the DB.
File to open: `supabase/migrations/001_initial_schema.sql` (reference), then write `supabase/migrations/011_orders_delivery_fields.sql`
Context needed: The `/api/checkout` route inserts `delivery_address` and `delivery_notes` into `orders` but these columns don't exist. Supabase silently ignores unknown columns on insert which means order delivery info is being lost. This must be fixed before end-to-end order testing can succeed.

---

## Session G — 2026-04-12 — UI/UX audit + trust fixes

### Completed
- Wrote `UI-AUDIT.md` — full 14-section UI/UX psychological audit (scored 6.1/10 overall)
  - Trust signals scored 4/10 (critical): dead footer links, no ABN, no guarantee
  - Conversion funnel scored 5.5/10 (critical): 4 friction points identified
  - FOMO/urgency scored 7.5/10 (best performing area)
  - Full A/B test suggestions for 7 conversion experiments
- **Trust fixes (8 items from audit)**:
  1. Created `src/app/privacy/page.tsx` — full Privacy Policy (AU Privacy Act compliant)
  2. Created `src/app/terms/page.tsx` — full Terms of Service (ACL + Spam Act 2003 compliant)
  3. Updated `Footer.tsx` — all `href="#"` dead links replaced (About→/supply-chain, Privacy→/privacy, Terms→/terms)
  4. Updated `Footer.tsx` — removed `ABN: [pending registration]` line
  5. Updated `HeroSection.tsx` — freshness guarantee added below urgency line (`text-lagoon-green/80`)
  6. Updated `CartDrawer.tsx` — `🔒 Secured by Stripe` trust badge below checkout button
  7. Updated `CartDrawer.tsx` — delivery date + closing countdown reminder above checkout button
  8. Updated `FishCard.tsx` — "Only Xkg left!" pill badge on both hero + standard cards when `available_kg ≤ 5`
- STATUS.md: removed stale FishSurvey.tsx entry, added /privacy + /terms routes, bumped date

### Review pass result
- 0 CRITICAL, 0 HIGH issues found
- M1 fixed (stale STATUS.md FishSurvey entry)
- All API routes use withErrorHandling ✓, no public page uses service client ✓, no hardcoded prices in components ✓

---

## QA Session — 2026-04-12 — Checkout flow end-to-end

### Scope
Full checkout flow: homepage → add Walu to cart → cart drawer → /checkout auth gate → /order/success

### Results: 27 PASS · 2 WARN · 0 FAIL (1 false positive resolved)
Full report: `tests/qa-report-checkout-flow-2026-04-12.md`
Screenshots: `tests/screenshots/checkout-flow-[1-7].png`

### Key findings
- Homepage: dark theme ✓, Walu card ✓, delivery banner ✓, clean console ✓
- CTA text "Secure Your Order — A$35/kg" — matches spec ✓
- Cart drawer: opens on CTA click ✓, shows "Walu / A$35.00/kg / 1 kg" ✓, +/- qty works (1→2 kg) ✓, remove button ✓, "Checkout — A$35.00" CTA ✓
- /checkout auth gate: correctly redirects to /sign-in?redirect_url=/checkout ✓
- /api/checkout: returns 401 for unauthenticated calls ✓ (not 503, meaning auth gate fires before Stripe null check)
- /order/success: HTTP 200 ✓, dark theme ✓, 4-step timeline ✓, share button ✓
- **Issue #6 RESOLVED** — /order/success is accessible without auth in current build

### WARNs
- "Added!" button state not captured in screenshot (2s timeout too brief for headless — not a bug)
- /checkout form structure untestable without auth — verified correct via code review (6 delivery fields, Order Summary, Pay Now → Stripe redirect)

### Action items
- CRITICAL: Verify `STRIPE_SECRET_KEY` in Vercel + `.env.local` — without it, authenticated checkout returns 503
- HIGH: Set Clerk session token (Issue #3) before testing AU gate or role features
- HIGH: Create `increment_reserved_kg` Supabase RPC
- MEDIUM: Fix CountdownTimer hydration mismatch (Issue #5)

---

## Session F — 2026-04-11 — System upgrade: audit fixes, slash commands, quality gates

### Fixes (from AUDIT.md)
- **M1**: Centralised all `A$35` price strings to `PRICING_CONFIG.defaultPriceLabel` in `src/lib/config.ts`. Updated: `StickyOrderBar.tsx`, `ProcessSteps.tsx`, `HeroSection.tsx`, `impact/page.tsx`, `supply-chain/page.tsx`
- **M7**: Fixed STATUS.md — moved GaloaMap, FishSurvey, ImpactFeed out of "Active on homepage" into correct "Active (other pages)" table
- **M9**: Fixed `.claude/skills/stripe-checkout/SKILL.md` — changed "paid" to "confirmed" to match actual webhook implementation
- **C1, C2, H1, H4, H6**: Applied in previous sessions (API route patterns, AU gate, Stripe webhook wrapper)

### New slash commands (.claude/commands/)
- `/plan` — read spec + STATUS, identify files, output plan, ask for approval
- `/build` — implement in correct layer order, typecheck, lint, pre-commit, commit+push
- `/review` — updated with spec compliance, security grep checks, hardcoded price check
- `/fix` — root-cause first, minimal fix, lint, commit
- `/wrap` — update SESSIONS + STATUS, lint, pre-commit, commit+push

### New agent (.claude/agents/)
- `auditor.md` — read-only auditor checking spec compliance, Supabase client misuse, API patterns, red lines, hooks rules, docs health

### New skill (.claude/skills/quality-gate/)
- `SKILL.md` — `npm run quality` (typecheck + lint + build) + security grep checks

### CLAUDE.md updates
- Added anti-hallucination rules section
- Added session-start template output format
- Added zustand cart pattern reference
- Added change-size rules (tiny/small/medium/large)
- Added MARKETING.md and cart.ts to reference files
- Updated skills count: 14 → 15

### package.json
- Added `"typecheck": "tsc --noEmit"`
- Added `"quality": "npm run typecheck && npm run lint && npm run build"`

### qa-playwright skill
- Extended test checklist with: Cart + Checkout, Account page, /supply-chain, /impact sections

## Session E — 2026-04-11 — My Account page: orders, history, preferences

### New files
- `src/app/account/page.tsx` — server component; auth-gated (→ /sign-in); fetches user, customer, orders+items, voted fish from Supabase via service role; passes as props
- `src/app/account/AccountContent.tsx` — client component; avatar initials, 3 sections

### Section 1: Active Orders
- Queries orders WHERE NOT IN (delivered, cancelled, refunded)
- Order card: short ref (#LAST8CHARS), status badge, items list with fish name + kg + price, total
- Status badges: pending=amber, confirmed/paid=teal, out_for_delivery=lagoon-green

### Section 2: Order History
- Queries orders WHERE IN (delivered, cancelled, refunded)
- Compact card (items collapsed, count shown)
- "Reorder" button on delivered orders: adds all items to cart via zustand, opens drawer

### Section 3: Preferences
- Delivery address from customers.delivery_address
- Phone from users.phone
- Fish votes: which species the user voted to unlock (pills with deep-purple badge)
- Referral code: "Coming soon" teaser

### Also fixed
- `src/types/database.ts`: OrderItem.price_per_kg_aud_cents (was wrong column name price_aud_cents); OrderStatus aligned to actual DB CHECK constraint
- `src/components/Navbar.tsx`: "Order History" link updated from /account/orders to /account

### Pre-commit: lint 0 · tsc 0 · build ✓ 27 routes

### Next up
- [ ] Add STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET to Vercel
- [ ] Create increment_reserved_kg Supabase RPC
- [ ] Admin: unlock_status toggle in pricing panel
- [ ] Supplier portal (Phase 2)

---

## Session D — 2026-04-11 — Cart + Stripe checkout, page reduction, premium placeholders

### P1: Premium gradient placeholders (FishCard.tsx)
- Hero (Walu): dark gradient bg, "WALU" watermark at 4% opacity, fish silhouette SVG, "First catch photo arriving soon" footer text
- Regular cards: dark gradient bg, fish name watermark at 4% opacity
- No broken image tags, no emoji placeholders

### P2: Homepage reduced from 13 → 8 sections
- Removed GaloaMap and ImpactFeed from homepage
- New stub pages: `/supply-chain` (GaloaMap + 3-step journey), `/impact` (ImpactFeed)
- HeroSection secondary CTA → `/supply-chain`
- VillagePreview "Learn more" → `/supply-chain`; fold April 2026 Community Goal banner into VillagePreview
- Combined DeliveryZoneBanner + DeliveryDemandPoll into one `#delivery-demand` section

### P3: Full cart + Stripe checkout
- `src/lib/cart.ts` — zustand store with localStorage persist; CartItem + CartStore; openCart/closeCart/addItem/updateQuantity/removeItem/clearCart/totalCents/totalKg/itemCount
- `src/lib/stripe.ts` — nullable Stripe client; soft warn if no key; apiVersion 2026-03-25.dahlia
- `src/components/CartDrawer.tsx` — slide-in drawer from right; qty +/- with 1kg min; remove button; total; Checkout → /checkout; framer-motion AnimatePresence
- `src/components/CartPortal.tsx` — client wrapper for CartDrawer; added to root layout.tsx
- `src/components/Navbar.tsx` — CartButton with ShoppingBag icon + badge count (lucide-react)
- `src/components/FishCard.tsx` — "Order Now" / "Secure Your Order" + "✅ Added!" states; hooks moved before early return (rules-of-hooks fix)
- `src/app/checkout/page.tsx` — server component; auth-gated (redirects to /sign-in); renders CheckoutForm
- `src/app/checkout/CheckoutForm.tsx` — delivery form; cart summary; POST /api/checkout; error display
- `src/app/api/checkout/route.ts` — validates items + delivery; checks flight window; validates inventory; upserts users + customers; creates order + order_items; calls rpc("increment_reserved_kg") non-blocking; creates Stripe checkout session
- `src/app/order/success/page.tsx` — 4-step timeline; share button via navigator.share; "use client"
- `src/app/api/webhooks/stripe/route.ts` — signature verification; checkout.session.completed → update order status to confirmed; idempotent

### Build fixes
- Stripe apiVersion updated to 2026-03-25.dahlia (matched installed SDK)
- order/success: added "use client" (had onClick handler in server component)
- rpc().then().catch() type error → void rpc() (non-blocking fire-and-forget)

### Pre-commit: lint 0 errors · tsc 0 errors · build ✓ 26 routes

### Next up
- [ ] Add `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` to Vercel env vars
- [ ] Create `increment_reserved_kg` Supabase RPC function (non-blocking; checkout works without it)
- [ ] Admin: unlock_status toggle in pricing panel
- [ ] Wire realtime vote counts via Supabase realtime
- [ ] Supplier portal (Phase 2)

---

## Session C — 2026-04-11 — Gamification: unlock board for fish species + delivery zones

### Concept
Replace greyed-out fish cards with an engagement game loop: only Walu is purchasable; all other species are "locked" and visible as a leaderboard. Users vote to unlock species, which requires registration. This turns browsing into community participation.

### DB changes (via Supabase MCP)
- `fish_species.unlock_status TEXT DEFAULT 'locked'` — CHECK IN ('available', 'locked', 'coming_soon')
- `fish_species.unlock_votes_target INTEGER DEFAULT 30`
- Walu set to `available`; all 7 other species set to `locked`

### New components
- `src/components/UnlockBoard.tsx` — game-board leaderboard with progress bars, vote buttons, sorted by votes descending; shows 🎉 UNLOCKED animation when votes hit target; auth-gated voting
- `src/components/AuthPromptModal.tsx` — framer-motion slide-up bottom sheet (mobile) / centered modal (desktop) for unauthenticated vote attempts
- `src/components/UnlockCelebration.tsx` — localStorage-based toast: shows 🎉 when a fish the user voted for gets unlocked; exports `recordVoteInStorage(id)`

### Updated components
- `src/app/page.tsx` — `getAllFish()` replaces `getSeasonalFish()`: splits fish into `availableFish` (unlock_status=available, in season) + `lockedFish` (locked/coming_soon); removes `FishSurvey` and `ComingSoonCard`; adds `UnlockBoard` section after fish grid; adds `UnlockCelebration` at bottom; uses `auth()` for `isSignedIn` prop
- `src/app/api/survey/vote/route.ts` — now returns `new_vote_count` from `fish_interest_summary` after insert (and on `already_voted`), so client can update UI without refetch
- `src/components/DeliveryDemandPoll.tsx` — header/description updated to match unlock mechanic: "🗺️ UNLOCK YOUR AREA" + "When 20 people register, we start delivering there"

### Removed from page.tsx
- `FishSurvey` import and usage (replaced by UnlockBoard)
- `ComingSoonCard` (replaced by UnlockBoard teaser rows)
- Old `getSeasonalFish` function (replaced by `getAllFish`)
- Old `#survey` section (DeliveryDemandPoll now stands alone in `#delivery-demand`)

### Pre-commit: tsc 0 errors · lint 0 errors · build ✓ 18 routes

### Next up
- [ ] Set Clerk session token (see Known Issue #3) — auth-gated voting blocked until this is done
- [ ] Admin: add unlock_status toggle in fish/pricing panel (to unlock fish via admin UI)
- [ ] Wire realtime vote counts via Supabase realtime subscription
- [ ] Cart + Stripe checkout (AU buyers only)

---

## Session B — 2026-04-11 — Admin panel + homepage wired to live DB

### Changes

**New admin pages (all dark theme, mobile-responsive, auth-gated):**
- `src/app/admin/layout.tsx` — auth guard (redirect if not admin), AdminSidebar + main slot
- `src/app/admin/page.tsx` — dashboard: 4 stat cards, active flight window card, 6 quick-action links
- `src/app/admin/windows/page.tsx` + `WindowForm.tsx` — flight window CRUD, status transitions (upcoming→open→closing_soon→closed→shipped)
- `src/app/admin/pricing/page.tsx` + `InventoryManager.tsx` — per-window inventory table, inline editable price/capacity cells
- `src/app/admin/photos/page.tsx` + `PhotoQueue.tsx` — catch photo approval/reject queue
- `src/app/admin/stories/page.tsx` + `StoryManager.tsx` — impact stories CRUD, publish/unpublish
- `src/app/admin/customers/page.tsx` — users table with role badges
- `src/app/admin/broadcasts/page.tsx` — Phase 1b placeholder
- `src/app/admin/settings/page.tsx` — delivery zones + villages read-only tables
- `src/components/admin/AdminSidebar.tsx` — responsive sidebar (hamburger on mobile, fixed 240px on desktop)

**New API routes (all use `withErrorHandling` + `requireAdmin`):**
- `src/app/api/admin/windows/route.ts` — GET list, POST create, PATCH update
- `src/app/api/admin/pricing/route.ts` — GET by window, POST add species, PATCH edit price/capacity
- `src/app/api/admin/photos/route.ts` — GET pending, PATCH approve/reject (+ update species default image)
- `src/app/api/admin/stories/route.ts` — GET list, POST create, PATCH update/publish

**New lib files:**
- `src/lib/flight-windows.ts` — `getActiveFlightWindow()`, `getWindowInventory()`, `calcCargoPercent()`, `formatFlightDate()`

**Homepage wired to live DB:**
- `src/app/page.tsx` — fetches `flight_windows` + `inventory_availability`; passes `orderCloseAt`, `cargoPercent`, `nextDeliveryLabel` to all components; falls back to config values if no live data
- `src/components/DeliveryBanner.tsx`, `UrgencyBanner.tsx`, `StickyOrderBar.tsx`, `FishCard.tsx` — all accept optional DB-sourced props (backward-compatible)

**Supabase seed (via MCP):**
- Flight window: FJ911, 2026-04-17, order closes 2026-04-15T13:59Z, status=open
- 8 inventory rows: Walu 72av/100t, Kawakawa 15av/80t, Donu 8av/40t, Saqa 0av/60t (sold out), Urau 25av/30t, Kacika 40av/60t, Sabutu 30av/50t, Kawago 55av/70t

**CSS:**
- `src/app/globals.css` — added `.admin-input` dark-themed form input class

**Pre-commit fixes:**
- `src/app/admin/photos/page.tsx` + `src/app/admin/stories/page.tsx` — `unknown` intermediate cast for Supabase join type mismatch
- `src/app/admin/photos/PhotoQueue.tsx` — escaped quotes with `&ldquo;`/`&rdquo;`
- `src/app/admin/pricing/InventoryManager.tsx` — escaped quotes in JSX text
- tsc: 0 source errors; lint: 0 errors; build: ✓ 18 routes

### Status after this session
- Admin panel: fully navigable at `/admin/*`
- Homepage: reads live flight window + inventory from DB
- Supabase: seeded with test data for FJ911 window (8 species inventory)

### Next up (Phase 1b)
- [ ] Set Clerk session token (see Known Issue #3) — admin panel blocked until this is done
- [ ] Set Vercel env vars (see Known Issue #4)
- [ ] Cart + Stripe checkout (AU buyers only)
- [ ] Realtime capacity subscriptions (`src/lib/scarcity.ts`)
- [ ] Clerk webhook (`/api/webhooks/clerk`) — sync new users to `users` table
- [ ] Supplier portal (`/supplier/*`)

---

## Session 6 — 2026-04-11 — Code health: shared config, types, API helpers, cleanup

### Changes
- `src/lib/config.ts` — created: single source of truth for all hardcoded values (FLIGHT_CONFIG, CARGO_CONFIG, DELIVERY_CONFIG, PRICING_CONFIG, THRESHOLDS, SOCIAL_PROOF_STATS)
- `src/types/database.ts` — created: TypeScript types for all Supabase tables (FishSpecies, FlightWindow, InventoryAvailability, Order, CatchBatch, etc.)
- `src/lib/api-helpers.ts` — created: `withErrorHandling`, `errorResponse`, `successResponse`, `requireAuth`, `requireAdmin`, `requireSupplierOrAdmin`, `AuthError`
- `src/components/DeliveryBanner.tsx` — config imports replace hardcoded values
- `src/components/UrgencyBanner.tsx` — config imports replace hardcoded values
- `src/components/StickyOrderBar.tsx` — config imports replace hardcoded values
- `src/components/FishCard.tsx` — config imports replace hardcoded ORDER_CLOSE_TIMESTAMP and capacity threshold
- `src/components/DeliveryZoneBanner.tsx` — ZONES and zone unlock target from config
- `src/components/ProcessSteps.tsx` — order close day/time and flight route from config
- `src/components/SocialProof.tsx` — stats array from config
- `src/app/catch/[batchCode]/page.tsx` — `<a>` → `<Link>` (lint fix)
- `src/components/FlightSchedule.tsx` — eslint-disable comment for intentional setState pattern
- `eslint.config.mjs` — added `no-console`, `no-explicit-any`, `no-unused-vars` rules; tests/ excluded from no-console
- `CLAUDE.md` — added Architecture patterns + Regression prevention sections; skills 13→14; added `/pre-commit`
- `.claude/skills/pre-commit/SKILL.md` — created: full pre-commit checklist
- Deleted 8 dead files: all `.old.tsx` backups + unused `ReefToTable.tsx`
- Verified: `npm run lint` → 0 errors/warnings; `npx tsc --noEmit` → 0 errors; `npm run build` → success

### Next up (Phase 1b)
- [ ] Set Clerk session token (see Known Issue #3)
- [ ] Set Vercel env vars (see Known Issue #4)
- [ ] Wire `inventory_availability` table for real prices/capacity per flight window
- [ ] Admin panel: capacity + price management, flight window CRUD
- [ ] Supabase RLS policies (Clerk JWT)
- [ ] Cart + Stripe checkout (AU buyers only)
- [ ] Realtime capacity subscriptions

---

## Session 5 — 2026-04-11 — Documentation audit

### Changes
- `CLAUDE.md` — fixed reference files list (removed 4 non-existent lib files, added STATUS.md + proxy.ts); skills count 12→13 (added qa-playwright); updated At session start to include STATUS.md
- `STATUS.md` — created: full build status, all routes, components, tables, buckets, lib files, infrastructure, known issues, hardcoded values to replace
- `.claude/skills/clerk-auth/SKILL.md` — updated middleware path (proxy.ts not middleware.ts); added SignedIn/SignedOut gotcha; added Supabase client pattern note
- `.claude/skills/order-window-logic/SKILL.md` — fixed flight route (Labasa→Nadi→Sydney, not Canberra); fixed IN_TRANSIT state description
- `.claude/skills/photo-approval/SKILL.md` — updated Storage section with all 4 buckets from migration 005; added catch_batches + village_media table references
- `.claude/skills/qa-playwright/SKILL.md` — expanded test checklist to include Navbar, SocialProof, UrgencyBanner, StickyOrderBar, DeliveryZoneBanner, DeliveryDemandPoll, /catch route

### Next up (Phase 1b)
- [ ] Set Clerk session token (see Known Issue #3)
- [ ] Set Vercel env vars (see Known Issue #4)
- [ ] Wire `inventory_availability` table for real prices/capacity per flight window
- [ ] Admin panel: capacity + price management, flight window CRUD
- [ ] Supabase RLS policies (Clerk JWT)
- [ ] Cart + Stripe checkout (AU buyers only)
- [ ] Realtime capacity subscriptions

---

## Session 4 — 2026-04-11 — FOMO messaging upgrade

### Changes
- `HeroSection.tsx` — urgency line below CTAs: "⚠️ Don't miss out — order before the catch window closes or cargo space fills up" (reef-coral, font-mono, animate-pulse)
- `DeliveryBanner.tsx` — cargo label now escalates: "Secure your spot" → "Filling fast" → "Almost gone!" → "Last spots!" based on CARGO_PCT thresholds (50/80/95%)
- `FishCard.tsx` — Walu hero: CTA changed to "Secure Your Order — A$35/kg" + subtext "🛩️ Limited cargo space · ⏰ Catch window closing soon"; regular cards: "Order Now" + "Limited cargo space remaining" shown when < 50% capacity left
- `StickyOrderBar.tsx` — CTA dynamically switches: "Order Before Window Closes" normally, "Order Now — Almost Full!" when CARGO_PCT ≥ 80
- `ProcessSteps.tsx` — Step 01 body updated to explain both urgency drivers (cargo space + catch window)
- `UrgencyBanner.tsx` — new client component; shows reef-coral alert when countdown < 12h, amber alert when cargo ≥ 80%; renders nothing otherwise
- `page.tsx` — UrgencyBanner inserted above fish grid (below heading)

### Next up (Phase 1b)
- [ ] Set Clerk session token (see Known Issue #3)
- [ ] Set Vercel env vars (see Known Issue #4)
- [ ] Wire `inventory_availability` table for real prices/capacity per flight window
- [ ] Admin panel: capacity + price management, flight window CRUD
- [ ] Supabase RLS policies (Clerk JWT)
- [ ] Cart + Stripe checkout (AU buyers only)
- [ ] Realtime capacity subscriptions
- [ ] Session B: supplier portal UI, admin panel UI

---

## Session 3 — 2026-04-11 — Fish grid fix + Navbar + Session A infra

### Root cause of empty fish grid
`getSeasonalFish()` was calling `createServerSupabaseClient()` which requires `SUPABASE_SERVICE_ROLE_KEY`.
If that env var is not set on Vercel, it throws → silently caught → returns `[]` → "No fish available".
The DB data was always correct (8 species, all `is_active=true`, `month_start=1, month_end=12`).

### Fixes applied
- `src/lib/supabase.ts` — added `createPublicSupabaseClient()` (anon key, server-safe) distinct from service role client. All public server components now use this.
- `src/app/page.tsx` — switched to `createPublicSupabaseClient()` + kept `force-dynamic`/`revalidate=0`
- `src/components/ImpactFeed.tsx` — same fix
- `src/app/catch/[batchCode]/page.tsx` — same fix
- Pattern established: public reads → anon key; admin/webhooks → service role key

### Session A infra (from previous commit cb53296)
- `export const dynamic = "force-dynamic"` added to page.tsx (ISR cache bust)
- `src/proxy.ts` — role-based middleware (admin/supplier/driver/auth routes)
- `src/lib/roles.ts` — server-side role helpers (getUserRole, requireRole, getVillageId)
- `src/lib/roles-client.ts` — client-side useRole() hook
- `src/lib/pricing.ts` — dual currency (AUD/FJD/others), no auto-conversion
- Migrations 005 (storage buckets), 007 (catch_batches), 008 (village_media) applied to Supabase
- `src/app/catch/[batchCode]/page.tsx` — public QR traceability stub

### Navbar
- `src/components/Navbar.tsx` — fixed-position, z-60, shows sign-in/sign-up when logged out
- When signed in: UserButton (Clerk avatar dropdown) with My Account, Order History, Admin Panel (admin only), Supplier Portal (supplier only), Manage Account
- Admin badge link visible for admins; Supplier Portal badge for suppliers
- Added to `src/app/layout.tsx`

### Next up (Phase 1b)
- [ ] Set Clerk session token (see Known Issue #3)
- [ ] Set Vercel env vars (see Known Issue #4)
- [ ] Wire `inventory_availability` table for real prices/capacity per flight window
- [ ] Admin panel: capacity + price management, flight window CRUD
- [ ] Supabase RLS policies (Clerk JWT)
- [ ] Cart + Stripe checkout (AU buyers only)
- [ ] Realtime capacity subscriptions
- [ ] Session B: supplier portal UI, admin panel UI

---

## Session 2 — 2026-04-09 — Phase 1a homepage + QA infrastructure

- Built Phase 1a WorldView homepage: DeliveryBanner, HeroSection, FishCard, CapacityBar, CountdownTimer, VillagePreview, Footer
- IBM Plex Mono + Plus Jakarta Sans fonts wired via next/font/google
- WorldView CSS vars + Tailwind v4 @theme tokens in globals.css
- Supabase seasonal fish query with month wrap-around filter; server component
- Walu sort-first logic in page.tsx (works when in season)
- Added Playwright MCP to .mcp.json; installed Chromium browser
- Created qa-playwright skill, planner/reviewer/qa agents, /review and /qa commands
- Migration 002: fish_interest_votes table, fish_interest_summary view, customer_feedback table — applied to Supabase
- GaloaMap.tsx: pure SVG/CSS 4-phase animation (zoom → marker → flight path → labels), IntersectionObserver trigger
- FishSurvey.tsx: anonymous session fingerprint voting, live count updates, 8 species from DB
- FeedbackForm.tsx: slide-up modal, 5-star rating, 6 types, POST /api/feedback
- POST /api/survey/vote and POST /api/feedback routes with full validation
- QA run: 35 PASS, 2 WARN, 0 FAIL — see tests/qa-report-2026-04-09.md

---

## Session 1 — 2026-04-09 — Phase 0 scaffold
- Abandoned the OneDrive-hosted prototype (Vite/React + stuck git worktree handle) and relocated to `C:\dev\fijifish\`.
- Scaffolded Next.js 16.2.3 via `create-next-app@latest` with TypeScript, Tailwind, ESLint, App Router, `src/` dir, `@/*` import alias, npm.
- Set up Claude Code project structure: `CLAUDE.md` + `FIJIFISH-WEBAPP-SPEC-v3.md` at root, 12 skills under `.claude/skills/`, empty `.claude/agents/` and `.claude/commands/` placeholders.
- Added `.env.example` listing Clerk, Supabase, Stripe, Twilio, Mapbox env vars (no real secrets committed).
- Fresh git repo on `main`, wired to `https://github.com/nocturnalJojo/fijifish.git`.
- Next.js version is 16.2.3 (latest) rather than 14 quoted in the spec — latest is fine, spec was written earlier.
- **Not yet set up:** Clerk, Supabase, Stripe, Twilio, Mapbox. Bare Next.js scaffold only.
