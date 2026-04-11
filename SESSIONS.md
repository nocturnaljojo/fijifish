# FijiFish — Session Log

Running log of what was built, decided, or unblocked each session. Claude reads this at session start (alongside `CLAUDE.md`) to pick up context.

Format: newest session on top. Each entry is a heading + short bullet list. Run `/wrap-up` at end of session to append.

---

## Known Issues

### #3 — ACTION REQUIRED: Clerk session token not customised
Role-based middleware and `getUserRole()` require Clerk to include `publicMetadata` in the session JWT.
Must be set in **Clerk Dashboard → Sessions → Customize session token**:
```json
{ "metadata": "{{user.public_metadata}}" }
```
Without this, all users are treated as buyers and `/admin`, `/supplier`, `/driver` routes redirect to `/`.

### #4 — ACTION REQUIRED: Verify Vercel env vars
`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` must be set in Vercel → Settings → Environment Variables.
`SUPABASE_SERVICE_ROLE_KEY` only needed for admin/webhook API routes (not required for the homepage fish grid).

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
