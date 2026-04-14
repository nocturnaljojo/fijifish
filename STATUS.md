# FijiFish — Build Status

Last updated: 2026-04-14 (Sessions K–M — flight window state machine + buyer dashboard + UI audit polish)

---

## Phase completion

| Phase | Description | Status |
|-------|-------------|--------|
| Phase 0 | Scaffold, Clerk auth, Supabase schema, seed | COMPLETE |
| Phase 1a | Homepage (fish grid, map, surveys), QA infra | ~90% complete |
| Phase 1b | Order flow, admin panel, RLS, Stripe checkout | IN PROGRESS |
| Phase 2 | Supplier portal, driver portal, tracking | NOT STARTED |
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
| `/admin/customers` | User list | LIVE |
| `/admin/broadcasts` | SMS/WhatsApp blasts | STUB (Phase 1b) |
| `/admin/settings` | Zones + villages | LIVE (read-only) |
| `/supplier/*` | Supplier portal | NOT BUILT |
| `/driver/*` | Driver portal | NOT BUILT |
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
| `/track/[orderId]` | Shipment tracking | NOT BUILT |

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
| GET/POST/PATCH `/api/admin/windows` | LIVE | Flight window CRUD |
| GET/POST/PATCH `/api/admin/pricing` | LIVE | Inventory price + capacity |
| GET/PATCH `/api/admin/photos` | LIVE | Photo approve/reject |
| GET/POST/PATCH `/api/admin/stories` | LIVE | Impact stories CRUD |
| GET `/api/supplier/*` | NOT BUILT | Supplier endpoints |

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

**Migration 012 applied:** `users.is_active` (boolean, default true) + `users.deleted_at` (timestamptz) added for soft-delete support. Clerk webhook sets `is_active=false` + `deleted_at` on `user.deleted` instead of hard-deleting (which would cascade and destroy order history).

---

## Supabase Storage buckets (migration 005)

| Bucket | Access | Max size | Status |
|--------|--------|----------|--------|
| `catch-photos` | Public | 1MB | Created, no uploads yet |
| `delivery-proofs` | Private | 5MB | Created, no uploads yet |
| `village-media` | Public | 50MB | Created, no uploads yet |
| `qr-labels` | Public | 512KB | Created, no uploads yet |

---

## Library files

| File | Status | Notes |
|------|--------|-------|
| `src/lib/supabase.ts` | LIVE | Three clients: public/browser/server |
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

**#8 — RLS policies missing on orders/order_items**
`/dashboard` queries use service role with explicit `WHERE customer_id = ?` as a security proxy.
Proper RLS policies (`buyer can only read their own orders`) should be added in Phase 1b.
Risk: low (service role is server-only, never exposed client-side), but must be done before Phase 2.

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
