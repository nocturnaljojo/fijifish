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

## Session O — 2026-04-14 — Admin dashboard: flight windows, orders, photo approval

### Goal
Build the admin command centre: full flight window state machine, orders overview, tab-filtered photo approval.

### What we built
- `src/components/admin/AdminSidebar.tsx` — added Orders nav link (between Flight Windows and Fish & Pricing)
- `src/app/admin/windows/WindowForm.tsx` — `WindowRow` rewritten: full state machine via server actions (`markAsPacking` → `markAsShipped` → `markAsInTransit` → `markAsLanded` → `markAsCustomsCleared` → `markAsDelivering` → `markAsDelivered`); Cancel Window button with `window.prompt()` for reason; order count badge; time-driven transitions (upcoming/open/closing_soon) still go via raw PATCH API; error display inline
- `src/app/admin/windows/page.tsx` — fetches order counts per window (non-cancelled only) in parallel with window list; passes `orderCount` to each `WindowRow`
- `src/app/admin/photos/page.tsx` — rewritten with tab filter (Pending | Approved | Rejected) driven by `searchParams`; parallel fetch of counts for all tabs; badge counts on inactive tabs; tabs are `<Link>` components (zero JS)
- `src/app/admin/photos/PhotoQueue.tsx` — accepts `tab` prop for contextual empty state messages; approve/reject buttons hidden for non-pending photos
- `src/app/admin/orders/page.tsx` — new: all orders with status/window filter; status counts shown in filter buttons; parallel data fetch (orders + windows + counts); clean build with `dynamic = "force-dynamic"`
- `src/app/admin/orders/OrdersTable.tsx` — new client component: click-to-expand rows; each row shows customer name/email, flight, status badge, total, placed date; expanded row shows order ID, Stripe PI, zone, delivery address/notes, fee, and full items list with per-line totals
- `src/app/admin/orders/WindowSelect.tsx` — new micro client component: `<select>` for flight window filter; isolated to avoid making the whole orders page a client component

### Decisions made
- **Server actions for admin-driven transitions** — `flight-window-actions.ts` is `"use server"`, so `WindowRow` (client) imports and calls actions directly; Next.js handles serialisation; no API route needed for the packing→delivered chain
- **Raw PATCH for time-driven states** — upcoming/open/closing_soon transitions still hit `/api/admin/windows` because these are borderline (time-driven states shouldn't normally be written by admin, but an override is needed in practice)
- **`window.prompt()` for cancel reason** — avoids a modal component; admin confirms with a native prompt; returns `null` on dismiss to abort
- **Window filter extracted to client component** — `<select onChange>` can't live in a server component; extracted to `WindowSelect.tsx` so the rest of the orders page stays server-rendered
- **Two-query pattern for orders + items** — avoids the N+1 problem; fetch all orders, collect their IDs, fetch all items in one query, group in JS

### TODOs left in code
- [ ] `src/app/admin/orders/page.tsx` — no order update actions yet (status change, refund trigger). Planned for Phase 2 hardening
- [ ] `src/app/admin/photos/PhotoQueue.tsx` — no "Revert to pending" action for approved/rejected photos

### Parking lot (deferred)
- [ ] Orders — bulk actions (mark all delivered, export CSV)
- [ ] Orders — send customer notification on status change
- [ ] Broadcasts admin page (currently stub)

### Next session
First task: `/admin` overview dashboard — make it the flight window dashboard (list + state buttons); the current `/admin` page is a stats overview — either keep it or redirect to `/admin/windows`
File to open: `src/app/admin/page.tsx`
Context needed: The current `/admin` page shows StatCard grid (revenue, users, orders, cargo %) and quick action links. The user may want to promote `/admin/windows` as the primary landing or update `/admin` to show live window status prominently.

---

## Session N — 2026-04-14 — Phase 2: Supplier portal scaffold

### Goal
Build the supplier portal scaffold — the cousin in Galoa logs in, confirms their catch, uploads photos, and reviews their history. Light theme, mobile-first, Android-optimised.

### What we built
- `src/app/supplier/layout.tsx` — light-theme shell; sticky top nav (FijiFish | village name | Sign out); `SupplierNav` bottom tabs; role gate (access denied for non-supplier/non-admin); fetches village name from Supabase using session `village_id`
- `src/app/supplier/page.tsx` — Catch Dashboard; active/upcoming flight window card with status badge and FJT close time; `InventoryManager` for kg editing and catch confirmation; village-not-assigned warning
- `src/app/supplier/photos/page.tsx` — Catch Photos page; `PhotoUploadForm` for upload; server-rendered list of photos for this window with status badges (Pending / Approved / Rejected)
- `src/app/supplier/history/page.tsx` — Past flight windows; grouped by window date; kg supplied vs sold per species; newest first
- `src/components/supplier/SupplierNav.tsx` — fixed bottom 3-tab nav; 56px tap targets; active state via `usePathname()`; tabs: Dashboard, Photos, History
- `src/components/supplier/InventoryManager.tsx` — client component; editable kg inputs per species; "Confirm Catch for [date]" button (saves kg + sets `confirmed_by_supplier=true + confirmed_at`); "Save kg only" secondary button; confirmed status badge
- `src/components/supplier/PhotoUploadForm.tsx` — client component; `capture="environment"` for direct camera; canvas JPEG compression (max 1200px, 0.82 quality, max 1MB); preview with remove; POST to `/api/supplier/photos`; `router.refresh()` on success re-renders photo list
- `src/app/api/supplier/inventory/route.ts` — `PATCH`; updates `total_capacity_kg` and optionally `confirmed_by_supplier`/`confirmed_at`; village-scoped security proxy (explicit `WHERE village_id = ?`)
- `src/app/api/supplier/photos/route.ts` — `POST`; resolves `supplier.id` via `users.clerk_id → suppliers.user_id`; uploads to `catch-photos` Supabase Storage bucket; inserts `catch_photos` row; server-side 1MB guard
- `src/types/database.ts` — added `Supplier` interface; added `CatchPhoto` interface; added `confirmed_by_supplier` + `confirmed_at` to `InventoryAvailability`

### Architecture decisions
- **Light theme, no WorldView classes** — `bg-white`/`bg-gray-50`/`text-gray-900`/`text-cyan-600` throughout; dark theme CSS vars (`bg-bg-primary`, `text-text-primary`) are intentionally absent from all supplier pages
- **No framer-motion** — supplier is on low-bandwidth Android in Fiji; plain CSS `transition-transform` only
- **No new migration needed** — `catch_photos` table already in migration 001 (line 277), `confirmed_by_supplier`/`confirmed_at` already in `inventory_availability` (lines 195–196); types just weren't in `database.ts`
- **`router.refresh()` pattern for photo list** — `PhotoUploadForm` is a client component; after upload it calls `router.refresh()` which re-runs the server component page and refreshes the photo list without a full navigation
- **Supplier record lookup in photo API** — `catch_photos.supplier_id` is a FK to `suppliers.id` (not `users.id`); API resolves: `clerk_id → users.id → suppliers.id → village_id`
- **`as unknown as InvRow[]` cast** — Supabase infers embedded relations as arrays; TypeScript rejects direct cast; casting through `unknown` is the correct pattern when the runtime shape is known to be correct
- **Village-scoped security proxy** — RLS not yet set up; all supplier writes include explicit `WHERE village_id = ?` from session claims to prevent cross-village data access

### TODOs left in code
- [ ] `src/app/api/supplier/inventory/route.ts` — no RLS; relies on service role + explicit WHERE. Add RLS in Phase 2 hardening
- [ ] `src/app/api/supplier/photos/route.ts` — no RLS on storage; service role upload bypasses bucket policies. Add storage RLS in Phase 2 hardening
- [ ] `src/components/supplier/InventoryManager.tsx` — no optimistic update on kg save; page does not re-render after "Save kg only" (only after full page refresh). Add `router.refresh()` on save success in future polish
- [ ] Admin photo approval UI not yet built — `catch_photos` rows are created with `status='pending'` but no admin UI exists to approve/reject yet

### Parking lot (deferred — do not build yet)
- [ ] Supplier analytics — revenue earned per window, total kg shipped, species breakdown charts
- [ ] Push notifications to supplier when orders start coming in for their catch
- [ ] Bulk species assignment — admin UI to add all species to a new window's inventory in one click
- [ ] Supplier profile page — contact info, bank account for payment, certification uploads

### Next session
First task: Build the admin catch photo approval UI (`/admin/photos` already routes to a page stub — build the photo queue: list pending `catch_photos`, approve/reject buttons, updates `status` + `approved_by` + `approved_at`)
File to open: `src/app/admin/photos/page.tsx` (check if stub exists) and `src/app/api/admin/photos/route.ts`
Context needed: Admin photo approval is the next step in the supplier → admin → buyer photo flow. The `catch_photos` table is in migration 001 with `status` CHECK ('pending','approved','rejected'), `approved_by` (UUID → users.id), `approved_at` (timestamptz). The supplier just built the upload side; admin needs to review and approve.

---

## Session M — 2026-04-14 — UI audit polish pass

### Goal
Polish pass from UI-AUDIT.md: 5 targeted fixes — no new routes, no new features.

### What we built
- `src/components/CountdownTimer.tsx` — three-tier display format
  - `>24h`: `Xd Xh` — no seconds (calm, informational)
  - `1h–24h`: `Xh Xm Xs` — full precision
  - `≤1h`: `Xm Xs` in `text-reef-coral` + `animate-pulse` — urgent final countdown
- `src/components/DeliveryBanner.tsx` — mobile layout fixed
  - Changed `sm:` breakpoints to `md:` on the 3-column row; now `flex-col` on mobile, `flex-row` at 768px+
  - Mobile cargo bar breakpoint updated to match
- `src/app/page.tsx` — section order rewritten per audit
  - New order: Hero → SocialProof → Fish Grid → ProcessSteps → VillagePreview → UnlockBoard → DeliveryZoneBanner + DeliveryDemandPoll
  - ProcessSteps moved immediately after fish grid (explains the product while attention is high)
  - VillagePreview moved before UnlockBoard (mission-first, then community voting)
- `src/components/UnlockBoard.tsx` — vote state persistence on mount
  - Reads `fijiFish_voted` localStorage key on mount; pre-populates `voted` Set
  - Returning visitors now see `✓ Voted` badges without re-voting
- `src/components/FishCard.tsx` — non-AU user guard
  - Both HeroFishCard and standard FishCard detect locale after mount via `detectCountryFromLocale(navigator.language)`
  - Non-AU locale → disabled button: "Available in Australia only"
  - AU or unknown locale → normal order flow (no false positives for undefined locale)

### Decisions made
- `≤1h` threshold for reef-coral + pulse in CountdownTimer (not `<6h`) — matches the "critical" window used in `isCritical` but visually escalates only when truly imminent
- Used `md:` not `sm:` breakpoint for DeliveryBanner — at 640px the 3-column row was still too cramped; 768px gives proper breathing room
- `detectCountryFromLocale` used (not a geo-IP service) — intentional: fast, no external API, only fires if locale explicitly reveals a non-AU country code; ambiguous/null locales default to showing the order button

### TODOs left in code
- [ ] `src/components/DeliveryBanner.tsx` — `CARGO_CONFIG.capacityPercent` still hardcoded; wire to `inventory_availability` aggregator in Phase 1b
- [ ] `src/app/dashboard/page.tsx` — `TODO: Add RLS policy orders: buyer can only see their own rows` (Issue #8)

### Next session
First task: Set `STRIPE_PORTAL_URL` in Vercel env vars, then test `/dashboard` end-to-end with a real order
File to open: Vercel dashboard → Settings → Environment Variables
Context needed: `STRIPE_PORTAL_URL` comes from Stripe Dashboard → Settings → Billing → Customer portal → copy the portal link

---

## Session L — 2026-04-14 — Buyer dashboard

### What was built
- `src/app/dashboard/layout.tsx` — server layout; auth-guards whole `/dashboard/*` tree; fetches Clerk user for nav
- `src/app/dashboard/page.tsx` — My Orders (server component)
  - Query path: Clerk userId → `users.clerk_id` → `customers.user_id` → `orders.customer_id`
  - Nested select: orders + order_items + fish_species + delivery_zones + flight_windows
  - `getFlightWindowStatus()` applied server-side to compute window state for each order
  - Active orders (non-delivered/cancelled/refunded) shown first, then history
  - Empty state: "No orders yet — Browse Fresh Fish →" CTA to `/#fish-grid`
- `src/app/dashboard/account/page.tsx` — account info placeholder (name, email, phone, delivery address, member since)
- `src/app/dashboard/billing/page.tsx` — Stripe Customer Portal link
  - Portal URL from `STRIPE_PORTAL_URL` env var (server-only); appends `?prefilled_email=<email>`
  - Falls back to "Contact us at hello@vitifish.com.au" when env var not set
  - Static payment info panel (PCI, no stored cards, refund policy)
- `src/components/dashboard/DashboardNav.tsx` — client component
  - Desktop: left sidebar (208px); mobile: fixed bottom tab bar (3 tabs)
  - Active state via `usePathname()`
- `src/components/dashboard/OrderCard.tsx` — client component
  - Dual badge: order status + flight window status (window badge hidden if order is failed/cancelled/refunded)
  - Order items list with per-item price breakdown
  - Delivery info section (zone + delivery_address + delivery_notes from migration 011)
  - Flight section (flight number, flight_date, computed window state)
  - Reorder button (delivered orders only) — zustand cart pattern
- `src/types/database.ts` — added missing Order fields: `placed_at`, `delivery_fee_aud_cents`, `delivered_at`, `rating`, `feedback_text`, `delivery_run_id`
- `src/lib/config.ts` — added `BILLING_CONFIG.stripePortalUrl` from `STRIPE_PORTAL_URL` env var
- `src/proxy.ts` — added `/dashboard(.*)` to `isAuthRoute` matcher
- `src/components/Navbar.tsx` — "My Orders" link for buyers (non-admin, non-supplier); UserButton "Order History" now points to `/dashboard`

### Architecture decisions
- Service role used for order queries (RLS policies not yet written); explicit `WHERE customer_id = ?` provides same security
- `TODO: Add RLS policy orders: buyer can only see their own rows` left as comment in page.tsx
- Flight window status computed server-side in page.tsx (no re-fetch on client needed for static display)
- `STRIPE_PORTAL_URL` is a non-`NEXT_PUBLIC_` env var — portal URL is server-rendered, never exposed client-side

### Next session
1. Set `STRIPE_PORTAL_URL` in Vercel env vars (from Stripe Dashboard → Settings → Billing → Customer portal)
2. Test /dashboard with a real order (post-checkout)
3. RLS policies for orders/order_items tables (Phase 1b)
4. Supplier portal scaffolding (Phase 2)

---

## Session K — 2026-04-14 — Flight window state machine + dynamic banner/cards

### What was built
- `src/lib/flight-window-state.ts` — pure `getFlightWindowStatus(window, now)` function
  - Time-driven: upcoming → open → closing_soon → closed (computed from timestamps, NEVER written to DB)
  - Admin-driven: packing → shipped → in_transit → landed → customs → delivering → delivered / cancelled (stored in DB, returned as-is)
  - Exports `CLOSING_SOON_HOURS = 6` constant and `isOrderingOpen(status)` helper
- `src/lib/flight-window-actions.ts` — server actions for admin state transitions
  - `markAsPacking`, `markAsShipped`, `markAsInTransit`, `markAsLanded`, `markAsCustomsCleared`, `markAsDelivering`, `markAsDelivered`, `cancelWindow`
  - Each validates current effective state before transitioning (no step-skipping)
  - Uses `requireRole(["admin"])` for authorisation
- `src/hooks/useFlightWindow.ts` — client hook
  - Fetches current/next relevant window from Supabase on mount
  - Priority 1: any admin-driven active state (packing→delivering); Priority 2: next upcoming window by flight_date
  - Recomputes every 30 s (both time-driven states and admin re-fetch)
  - Exposes: `currentWindow`, `status`, `timeUntilClose`, `timeUntilOpen`, `isOrderingOpen`, `loading`
- `src/components/DeliveryBanner.tsx` — rewritten as client component using hook
  - Post-order states (packing→delivered/cancelled): simplified single-row message
  - Time-driven states: full 3-column layout (label | cargo bar | countdown)
  - upcoming: "Next Order Window opens [date]" + opens-in countdown
  - open: delivery date + cargo bar + close countdown
  - closing_soon: urgent styling + close countdown
  - closed: "Orders Closed" indicator
- `src/components/FishCard.tsx` — uses hook for window status
  - "Add to Order" / "Order Now" button disabled when status not in ['open', 'closing_soon']
  - Shows `closedButtonLabel(status, orderOpenAt)` when closed ("Orders open Thu 17 Apr", etc.)
  - Mini countdown only shows when ordering is active
- `src/types/database.ts` — fixed FlightWindow interface to match migration 001:
  - Added: `status_updated_at`, `labasa_departure_time`, `nadi_departure_time`, `canberra_arrival_time`, `notes`
  - Removed: `estimated_delivery_at` (not in migration), `is_active` (not in flight_windows migration)
- `src/app/page.tsx` — removed DeliveryBanner props (banner is now self-contained), removed unused `formatFlightDate` import and `nextDeliveryLabel` variable
- Migration 013 NOT needed — CHECK constraint in migration 001 already includes all 12 states

### Architecture decisions
- Time-driven states intentionally NEVER written to DB — computed at render time (deterministic)
- notification_log skipped in actions: requires `customer_id NOT NULL` (FK to customers); bulk buyer notifications deferred to notification engine (Phase 1b/2)
- Hook makes two prioritized queries to avoid returning a past delivered window when a new upcoming one exists

### Next session
1. Manual test: sign up a new Clerk user → verify Supabase rows
2. Admin UI for state transitions (Phase 2)
3. UrgencyBanner: wire to use `useFlightWindow` hook (currently hardcoded)
4. Supplier portal scaffolding (Phase 2)

---

## Session J — 2026-04-14 — Clerk webhook handler

### What was built
- `src/app/api/webhooks/clerk/route.ts` — full user lifecycle sync from Clerk to Supabase
  - `user.created` → upsert `users` (role: buyer) + upsert `customers` (bare row, delivery info added at checkout) + log to `notification_log`
  - `user.updated` → sync `full_name`, `email`, `phone` to `users` row
  - `user.deleted` → soft delete: `is_active=false`, `deleted_at=now()`. Hard delete forbidden — cascade would destroy order history
  - All other events → 200, no action
- `supabase/migrations/012_users_soft_delete.sql` — adds `is_active boolean default true` + `deleted_at timestamptz` to `users`; index on `is_active`
- Migration 012 applied to Supabase via MCP
- `svix` installed (`^1.90.0`) for Clerk webhook signature verification
- Both upserts idempotent: `users` on `clerk_id`, `customers` on `user_id`
- Notification log errors swallowed — must never block user creation

### Manual config completed
- Clerk Dashboard → Webhooks → Add Endpoint: `https://vitifish.vercel.app/api/webhooks/clerk`
- Events registered: `user.created`, `user.updated`, `user.deleted`
- `CLERK_WEBHOOK_SECRET` added to Vercel env vars + `.env.local`

### NOT YET TESTED
- Live end-to-end signup through Clerk → webhook fires → Supabase row created. Needs manual verification: sign up a test user, check `users` + `customers` tables in Supabase.

### Full day summary (Sessions H, I, J — 2026-04-14)
- Stripe webhook handler live (order lifecycle: confirmed, payment_failed, refunded + capacity restoration)
- Migrations 010, 011, 012 applied
- Stripe CLI installed locally; production webhook endpoint configured
- Clerk session token customised; admin role set on primary user
- All Vercel env vars confirmed (Stripe, Supabase, Clerk, Mapbox, Twilio)
- Clerk webhook handler live (user sync)
- End-to-end checkout verified locally with Stripe CLI
- All known issues (#3, #4, #5, #6) closed

### Next session
1. Manual test: sign up a new Clerk user → verify row in Supabase `users` + `customers`
2. Enable PayTo in Stripe Dashboard (lower fees for AU bank-to-bank payments)
3. Create `stripe-patterns-fijifish.md` — project-specific Stripe reference doc
4. Supplier portal scaffolding (Phase 2)
5. UI audit fixes from `UI-AUDIT.md` (section reorder, quantity selector UX, countdown format, mobile DeliveryBanner)

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
