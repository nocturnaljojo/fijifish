# FijiFish — Build Status

Last updated: 2026-04-15 (Sessions R–U — driver portal + delivery assignment + RLS policies + Clerk JWT integration)

---

## Phase completion

| Phase | Description | Status |
|-------|-------------|--------|
| Phase 0 | Scaffold, Clerk auth, Supabase schema, seed | COMPLETE |
| Phase 1a | Homepage (fish grid, map, surveys), QA infra | ~90% complete |
| Phase 1b | Order flow, admin panel, RLS, Stripe checkout | IN PROGRESS |
| Phase 2 | Supplier portal, driver portal, tracking | IN PROGRESS |
| Phase 3 | Broadcasts, impact stories, multi-village | NOT STARTED |

---

## Live routes (Vercel + localhost)

| Route | Type | Status |
|-------|------|--------|
| `/` | Homepage | LIVE |
| `/sign-in` | Clerk sign-in | LIVE |
| `/sign-up` | Clerk sign-up | LIVE |
| `/catch/[batchCode]` | QR traceability stub | LIVE (stub only) |
| `/admin` | Admin dashboard | LIVE |
| `/admin/windows` | Flight window management | LIVE |
| `/admin/pricing` | Inventory price + capacity | LIVE |
| `/admin/photos` | Catch photo approval queue | LIVE |
| `/admin/stories` | Impact stories CRUD | LIVE |
| `/admin/orders` | All orders, status/window filter, expandable rows | LIVE |
| `/admin/tracking` | Shipment timeline per active window + Add Update form | LIVE |
| `/admin/customers` | User list | LIVE |
| `/admin/broadcasts` | Compose + history; audience targeting; Spam Act compliant | LIVE (Twilio not connected) |
| `/admin/settings` | Zones + villages | LIVE (read-only) |
| `/supplier` | Supplier dashboard — flight window + inventory confirmation | LIVE |
| `/supplier/photos` | Catch photo upload + photo list | LIVE |
| `/supplier/tracking` | Post caught/processing/packed/at_airport updates with photos | LIVE |
| `/supplier/history` | Past flight windows | LIVE |
| `/admin/deliveries` | Delivery run list — grouped by window, progress bar, create CTA | LIVE |
| `/admin/deliveries/create/[windowId]` | Create delivery run — driver select, stop table, sequence inputs, communal detection | LIVE |
| `/driver` | Driver portal — today's run, start/stop controls, per-stop actions | LIVE |
| `/driver/deliver/[stopId]` | Delivery proof capture — camera, GPS, received-by, proxy flag | LIVE |
| `/driver/history` | Past completed runs, expandable stop detail + proof photos | LIVE |
| `/checkout` | Checkout (auth-gated delivery form) | LIVE |
| `/order/success` | Post-payment confirmation + 4-step timeline | LIVE |
| `/supply-chain` | Supply chain story (stub) | LIVE |
| `/impact` | Village impact stories (stub) | LIVE |
| `/privacy` | Privacy Policy page | LIVE |
| `/terms` | Terms of Service page | LIVE |
| `/account` | Buyer account — orders, history, preferences | LIVE |
| `/dashboard` | Buyer dashboard — My Orders (active + history) | LIVE |
| `/dashboard/account` | Account info (name, email, phone, address) | LIVE |
| `/dashboard/billing` | Stripe Customer Portal link + payment info | LIVE |
| `/dashboard/tracking/[orderId]` | Buyer order tracking — 11-step timeline with photos | LIVE |

---

## API routes

| Route | Status | Notes |
|-------|--------|-------|
| POST `/api/survey/vote` | LIVE | Fish interest vote |
| POST `/api/feedback` | LIVE | 5-star feedback form |
| POST `/api/delivery-demand/vote` | LIVE | Delivery zone demand poll |
| POST `/api/checkout` | LIVE | Cart → Stripe checkout session |
| POST `/api/webhooks/clerk` | LIVE | user.created/updated/deleted → Supabase users + customers sync; svix sig verification |
| POST `/api/webhooks/stripe` | LIVE | checkout.session.completed + payment_failed + charge.refunded; capacity management |
| GET/POST `/api/admin/deliveries` | LIVE | GET: list all runs with progress; POST: create delivery_run + delivery_stops + link orders |
| GET `/api/driver` | LIVE | Active/planned run + stops + order items for current driver |
| PATCH `/api/driver` | LIVE | start_run / complete_run / mark_arrived / mark_delivered / skip_stop |
| POST `/api/driver/proof` | LIVE | Upload proof photo to delivery-proofs bucket + insert delivery_proofs row |
| POST `/api/driver/gps` | LIVE | Insert driver_gps_logs row |
| GET/POST/PATCH `/api/admin/windows` | LIVE | Flight window CRUD |
| GET/POST/PATCH `/api/admin/pricing` | LIVE | Inventory price + capacity |
| GET/PATCH `/api/admin/photos` | LIVE | Photo approve/reject |
| GET/POST/PATCH `/api/admin/stories` | LIVE | Impact stories CRUD |
| PATCH `/api/supplier/inventory` | LIVE | Update kg + confirm_by_supplier; village-scoped |
| POST `/api/supplier/photos` | LIVE | Upload to catch-photos bucket + insert catch_photos row |
| POST `/api/tracking` | LIVE | Role-gated shipment update; photo upload to shipment-updates bucket |
| GET `/api/broadcasts` | LIVE | List all broadcasts; or preview recipient count (?preview=1&segment=...) |
| POST `/api/broadcasts` | LIVE | Create + log broadcast; Spam Act STOP enforcement; Twilio TODO |
| GET `/api/broadcasts/[id]` | LIVE | Broadcast detail + recipient list with delivery status |

---

## Components

### Active (rendered on homepage)
| Component | Description |
|-----------|-------------|
| `Navbar.tsx` | Fixed-top nav, Clerk UserButton, role-based badge links |
| `DeliveryBanner.tsx` | Top banner: countdown + escalating cargo label |
| `HeroSection.tsx` | Hero with urgency line |
| `SocialProof.tsx` | Count-up stats bar (47 people, 8 zones, 3500km) |
| `UrgencyBanner.tsx` | Auto-shows when cargo ≥80% or window <12h |
| `FishCard.tsx` | Fish grid card; Walu hero variant with "Most Popular" badge |
| `CapacityBar.tsx` | kg remaining visual bar |
| `CountdownTimer.tsx` | Countdown with `baseColor` prop; pulses in final hours |
| `ProcessSteps.tsx` | 3-step how-it-works, whileInView stagger |
| `DeliveryZoneBanner.tsx` | Delivery zone awareness section |
| `DeliveryDemandPoll.tsx` | Vote on delivery zones |
| `VillagePreview.tsx` | Galoa village preview card |
| `Footer.tsx` | Footer with route chain and links |
| `StickyOrderBar.tsx` | Mobile-only bottom bar, appears after scroll |
| `FeedbackForm.tsx` | Slide-up modal, 5-star rating |

### Active (other pages)
| Component | Page | Description |
|-----------|------|-------------|
| `GaloaMap.tsx` | `/supply-chain` | SVG/CSS animated map: zoom→marker→flight path→labels |
| `ImpactFeed.tsx` | `/impact` | Village impact stories from Supabase |

### Dashboard components (buyer portal)
| Component | Description |
|-----------|-------------|
| `dashboard/DashboardNav.tsx` | Desktop sidebar + mobile bottom tab bar; active state via `usePathname()` |
| `dashboard/OrderCard.tsx` | Order card — dual status badges (order + window), items, delivery info, flight, Reorder button |

### Driver components (Phase 3)
| Component | Description |
|-----------|-------------|
| `driver/DriverNav.tsx` | Fixed bottom 3-tab nav (Today's Run / Deliveries / History); active state via usePathname() |
| `driver/RunManager.tsx` | Start Run, per-stop actions (Mark Arrived / Deliver+Photo / Skip), Complete Run; GPS polling every 60s |
| `driver/DeliveryProofForm.tsx` | Camera capture (rear-facing), canvas compression 1200px/0.82, GPS auto-capture, received_by_name, proxy flag |

### Supplier components (Phase 2)
| Component | Description |
|-----------|-------------|
| `supplier/SupplierNav.tsx` | Fixed bottom 3-tab nav (Dashboard / Photos / History); active state via usePathname() |
| `supplier/InventoryManager.tsx` | Editable kg per species, Confirm Catch + Save kg buttons; PATCH /api/supplier/inventory |
| `supplier/PhotoUploadForm.tsx` | Camera capture, canvas JPEG compression (max 1MB), POST to /api/supplier/photos, router.refresh() on success |

### Admin components
| Component | Description |
|-----------|-------------|
| `admin/AdminSidebar.tsx` | Responsive sidebar, hamburger mobile, fixed 240px desktop |
| `admin/windows/WindowForm.tsx` | Create window form + status transition buttons |
| `admin/pricing/InventoryManager.tsx` | Inline-editable price/capacity table |
| `admin/photos/PhotoQueue.tsx` | Photo cards with approve/reject |
| `admin/stories/StoryManager.tsx` | Story CRUD with publish toggle |
| `UnlockBoard.tsx` | Leaderboard of locked fish with vote progress bars + auth gate |
| `AuthPromptModal.tsx` | Slide-up auth prompt for unauthenticated voters (framer-motion) |
| `UnlockCelebration.tsx` | localStorage-based unlock toast + `recordVoteInStorage` helper |
| `CartDrawer.tsx` | Slide-in cart drawer from right; qty +/-; framer-motion AnimatePresence |
| `CartPortal.tsx` | Client wrapper for CartDrawer; renders in root layout |

---

## Supabase tables (applied migrations)

| Table | Migration | Notes |
|-------|-----------|-------|
| `fish_species` | 001 | 8 species seeded, all is_active=true |
| `seasons` | 001 | All month_start=1, month_end=12 (year-round) |
| `villages` | 001 | Galoa, Bua seeded |
| `fish_species` | 001 | `unlock_status` + `unlock_votes_target` columns added; Walu=available, 7 others=locked |
| `flight_windows` | 001 | FJ911 seeded (2026-04-17, status=open) |
| `delivery_zones` | 001 | Riverina zones |
| `customers` | 001 | Populated by Clerk webhook (user.created) |
| `orders` | 001 | Populated at checkout; confirmed by Stripe webhook |
| `order_items` | 001 | Populated at checkout |
| `inventory_availability` | 001 | LIVE — 8 rows seeded for FJ911 window |
| `fish_interest_votes` | 002 | Live |
| `fish_interest_summary` | 002 | View — live |
| `customer_feedback` | 002 | Live |
| `delivery_demand_votes` | 003 | Live |
| `impact_stories` | 004 | Live |
| `catch_batches` | 007 | Schema ready; not yet used in UI |
| `village_media` | 008 | Schema ready; not yet used in UI |
| `inventory_availability` | 009 | `increment_reserved_kg` RPC — atomic reservation at checkout |
| `orders` | 010 | `payment_failed` added to status CHECK; `decrement_reserved_kg` RPC for capacity restoration |

**Note: migration 006 was skipped.**

**Migration 011 applied:** `delivery_address` and `delivery_notes` columns added to `orders` table. Checkout route now persists delivery address correctly.

**Migration 014 created:** `sms_opt_out` and `whatsapp_opt_out` boolean columns on `customers`. **MANUAL APPLY REQUIRED** in Supabase SQL Editor. Without it, channel-specific opt-outs won't work (broadcast_opt_out master flag still enforced).

**Migration 015 created:** Full RLS policies on all 24 customer-facing tables. **MANUAL APPLY REQUIRED** via Supabase SQL Editor. Includes helper functions `requesting_user_clerk_id()` and `requesting_user_role()`. Public SELECT and anon INSERT policies work immediately; user-specific policies require Clerk JWT → Supabase setup (see issue #11).

**Migration 013 created:** `shipment-updates` storage bucket SQL (public, 2MB, JPEG/PNG/WebP). **MANUAL TASK REQUIRED:** Apply migration 013 in Supabase Dashboard → SQL Editor (Storage bucket INSERT is not auto-applied).

**Migration 012 applied:** `users.is_active` (boolean, default true) + `users.deleted_at` (timestamptz) added for soft-delete support. Clerk webhook sets `is_active=false` + `deleted_at` on `user.deleted` instead of hard-deleting (which would cascade and destroy order history).

---

## Supabase Storage buckets (migration 005)

| Bucket | Access | Max size | Status |
|--------|--------|----------|--------|
| `catch-photos` | Public | 1MB | Created, uploads live |
| `shipment-updates` | Public | 2MB | Created, set public 2026-04-16 |
| `delivery-proofs` | Public | 5MB | Created, set public 2026-04-16 |
| `village-media` | Public | 50MB | Created, no uploads yet |
| `qr-labels` | Public | 512KB | Created, no uploads yet |

---

## Library files

| File | Status | Notes |
|------|--------|-------|
| `src/lib/supabase.ts` | LIVE | Four clients: public/browser/server/user (Clerk JWT) |
| `src/lib/supabase-auth.ts` | LIVE | `getSupabaseUser()` — server helper, returns user-scoped Supabase client via Clerk JWT |
| `src/lib/roles.ts` | LIVE | getUserRole, requireRole, getVillageId |
| `src/lib/roles-client.ts` | LIVE | useRole() hook |
| `src/lib/pricing.ts` | LIVE | AUD/FJD detection, isAustralian() |
| `src/lib/config.ts` | LIVE | All configurable constants (FLIGHT_CONFIG, CARGO_CONFIG, THRESHOLDS, etc.) |
| `src/lib/api-helpers.ts` | LIVE | withErrorHandling, requireAuth, requireAdmin, errorResponse |
| `src/lib/flight-windows.ts` | LIVE | getActiveFlightWindow, getWindowInventory, calcCargoPercent, formatFlightDate |
| `src/types/database.ts` | LIVE | TypeScript types for all Supabase tables |
| `src/proxy.ts` | LIVE | Role-based middleware |
| `src/lib/cart.ts` | LIVE | zustand cart store with localStorage persist |
| `src/lib/stripe.ts` | LIVE | Nullable Stripe client; soft warn if unconfigured |
| `src/lib/flight-window-state.ts` | LIVE | Pure `getFlightWindowStatus(window, now)` — time-driven states computed, admin-driven states from DB |
| `src/lib/flight-window-actions.ts` | LIVE | Server actions for admin state transitions (markAsPacking → markAsDelivered, cancelWindow) |
| `src/hooks/useFlightWindow.ts` | LIVE | Client hook — fetches current window, recomputes status every 30s |
| `src/lib/order-engine.ts` | NOT BUILT | (was: order window state machine — superseded by flight-window-state.ts) |
| `src/lib/route-optimiser.ts` | NOT BUILT | Delivery route optimisation |
| `src/lib/notifications.ts` | NOT BUILT | Twilio SMS/WhatsApp dispatcher |
| `src/lib/scarcity.ts` | NOT BUILT | Realtime capacity subscriptions |

---

## Infrastructure

| Service | Status | Notes |
|---------|--------|-------|
| Vercel | LIVE | Project "vitifish", team "jovis-projects-e419e68a", auto-deploys on push to main |
| Supabase | LIVE | AU region, anon key set in Vercel |
| Clerk | LIVE | Auth working; session token customised; admin role set on primary user |
| Stripe | LIVE | `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` confirmed in Vercel; webhook round-trip tested locally with Stripe CLI |
| Twilio | NOT CONNECTED | Keys not yet added |
| Mapbox | NOT CONNECTED | Keys not yet added |

---

## Known issues (action required)

**No open blocking issues.**

**#7 — Pending manual config: STRIPE_PORTAL_URL not yet set**
`/dashboard/billing` falls back to a "Contact us" email until `STRIPE_PORTAL_URL` is set in Vercel.
To fix: Stripe Dashboard → Settings → Billing → Customer portal → copy URL → add as `STRIPE_PORTAL_URL` in Vercel env vars (server-only, no NEXT_PUBLIC_ prefix).

**#8 — RESOLVED: RLS policies added (Session T, 2026-04-15)**
Migration 015 written with full RLS coverage on all 24 tables. **MANUAL APPLY REQUIRED** via Supabase SQL Editor.
Public SELECT policies work immediately (anon key). User-specific policies (orders, customers) require Clerk JWT → Supabase configuration (see #11 below).

**#11 — RESOLVED: Clerk JWT → Supabase integration (2026-04-16)**
Clerk JWT template "supabase" created (HS256, Supabase JWT secret as signing key). Claims: `aud=authenticated`, `email`, `role=authenticated`. Supabase now trusts Clerk-issued JWTs — `auth.uid()` resolves on buyer/supplier/driver pages. Code was already wired (`getSupabaseUser()` in `src/lib/supabase-auth.ts`). No code changes needed.

**#9 — RESOLVED: Storage bucket access fixed (2026-04-16)**
`delivery-proofs` and `shipment-updates` buckets set to public in Supabase Dashboard → Storage. `getPublicUrl()` in `src/app/api/driver/proof/route.ts` now returns accessible URLs. Server-side role gates still enforce who can upload.

**#10 — RESOLVED: Admin delivery run assignment built (Session S, 2026-04-15)**
`/admin/deliveries` and `/admin/deliveries/create/[windowId]` now live. Driver portal reads from real DB rows.

**Resolved:**
- #3 — Clerk session token: `{ "metadata": "{{user.public_metadata}}" }` set in Clerk Dashboard (2026-04-14)
- #4 — All Vercel env vars confirmed: Supabase, Stripe, Clerk, Mapbox, Twilio (2026-04-14)
- #5 — CountdownTimer SSR-safe pattern in place; lint rule documented (2026-04-14)
- #6 — /order/success accessible without auth (2026-04-12)

---

## Future Roadmap (not yet planned, noted for later)

- [ ] PayTo enablement in Stripe Dashboard — lower fees for AU bank-to-bank payments
- [ ] Afterpay integration — buy now pay later for AU customers
- [ ] Zip Pay integration — alternative BNPL option
- [ ] Fiji Airways partnership — negotiate volume cargo discounts, co-branding, promotional flights
- [ ] Fiji Airways loyalty tie-in — "FijiFish Flyer" points or bundled deals
- [ ] Multi-payment gateway — Stripe + Afterpay + Zip Pay checkout options
- [ ] Pacific community payment methods — M-PAiSA (Vodafone Fiji), MyCash for FJD payments

---

## Hardcoded values status

`DeliveryBanner` is now self-contained: fetches `flight_windows` directly via `useFlightWindow` hook, no props required. State-machine drives all messaging (upcoming / open / closing_soon / closed / packing / shipped / in_transit / …).

`FishCard` uses `useFlightWindow` hook for `isOrderingOpen`; button disabled outside open/closing_soon.

`UrgencyBanner` and `StickyOrderBar` still accept props from `page.tsx` (config fallback). `page.tsx` fetches live `flight_windows` + `inventory_availability`.

All "A$35" price labels centralised to `PRICING_CONFIG.defaultPriceLabel` in `src/lib/config.ts`.

Remaining hardcoded:
- `CARGO_CONFIG.capacityPercent` in `DeliveryBanner` — cargo % still from config until `inventory_availability` is wired to a real-time aggregator
- `TEST_INVENTORY` in `page.tsx` — still used when a species has no `inventory_availability` row for the current window
