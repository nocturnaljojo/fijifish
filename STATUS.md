# FijiFish — Build Status

Last updated: 2026-04-11 (Session B)

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
| `/order` | Order/cart | NOT BUILT |
| `/account` | Buyer account | NOT BUILT |
| `/track/[orderId]` | Shipment tracking | NOT BUILT |

---

## API routes

| Route | Status | Notes |
|-------|--------|-------|
| POST `/api/survey/vote` | LIVE | Fish interest vote |
| POST `/api/feedback` | LIVE | 5-star feedback form |
| POST `/api/delivery-demand/vote` | LIVE | Delivery zone demand poll |
| POST `/api/webhooks/clerk` | NOT BUILT | User sync to Supabase |
| POST `/api/webhooks/stripe` | NOT BUILT | Payment confirmation |
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
| `GaloaMap.tsx` | SVG/CSS animated map: zoom→marker→flight path→labels |
| `FishSurvey.tsx` | Anonymous vote on fish species interest |
| `DeliveryDemandPoll.tsx` | Vote on delivery zones |
| `ImpactFeed.tsx` | Village impact stories from Supabase |
| `VillagePreview.tsx` | Galoa village preview card |
| `Footer.tsx` | Footer with route chain and links |
| `StickyOrderBar.tsx` | Mobile-only bottom bar, appears after scroll |
| `FeedbackForm.tsx` | Slide-up modal, 5-star rating |

### Admin components
| Component | Description |
|-----------|-------------|
| `admin/AdminSidebar.tsx` | Responsive sidebar, hamburger mobile, fixed 240px desktop |
| `admin/windows/WindowForm.tsx` | Create window form + status transition buttons |
| `admin/pricing/InventoryManager.tsx` | Inline-editable price/capacity table |
| `admin/photos/PhotoQueue.tsx` | Photo cards with approve/reject |
| `admin/stories/StoryManager.tsx` | Story CRUD with publish toggle |

---

## Supabase tables (applied migrations)

| Table | Migration | Notes |
|-------|-----------|-------|
| `fish_species` | 001 | 8 species seeded, all is_active=true |
| `seasons` | 001 | All month_start=1, month_end=12 (year-round) |
| `villages` | 001 | Galoa, Bua seeded |
| `flight_windows` | 001 | FJ911 seeded (2026-04-17, status=open) |
| `delivery_zones` | 001 | Riverina zones |
| `customers` | 001 | Clerk user sync target (webhook not yet built) |
| `orders` | 001 | Not yet used |
| `order_items` | 001 | Not yet used |
| `inventory_availability` | 001 | LIVE — 8 rows seeded for FJ911 window |
| `fish_interest_votes` | 002 | Live |
| `fish_interest_summary` | 002 | View — live |
| `customer_feedback` | 002 | Live |
| `delivery_demand_votes` | 003 | Live |
| `impact_stories` | 004 | Live |
| `catch_batches` | 007 | Schema ready; not yet used in UI |
| `village_media` | 008 | Schema ready; not yet used in UI |

**Note: migration 006 was skipped.**

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
| `src/lib/order-engine.ts` | NOT BUILT | Order window state machine |
| `src/lib/route-optimiser.ts` | NOT BUILT | Delivery route optimisation |
| `src/lib/notifications.ts` | NOT BUILT | Twilio SMS/WhatsApp dispatcher |
| `src/lib/scarcity.ts` | NOT BUILT | Realtime capacity subscriptions |

---

## Infrastructure

| Service | Status | Notes |
|---------|--------|-------|
| Vercel | LIVE | Project "vitifish", team "jovis-projects-e419e68a", auto-deploys on push to main |
| Supabase | LIVE | AU region, anon key set in Vercel |
| Clerk | LIVE | Auth working; **session token NOT customised** (see Known Issues) |
| Stripe | NOT CONNECTED | Keys not yet added |
| Twilio | NOT CONNECTED | Keys not yet added |
| Mapbox | NOT CONNECTED | Keys not yet added |

---

## Known issues (action required)

**#3 — Clerk session token not customised**
Role middleware and getUserRole() return "buyer" for all users until this is set.
Fix: Clerk Dashboard → Sessions → Customize session token → add `{ "metadata": "{{user.public_metadata}}" }`

**#4 — Vercel env vars**
`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` must be set in Vercel.
`SUPABASE_SERVICE_ROLE_KEY` only needed for admin/webhook routes (NOT public pages).

---

## Hardcoded values status

All homepage components (`DeliveryBanner`, `UrgencyBanner`, `StickyOrderBar`, `FishCard`) now accept optional props from DB. `page.tsx` fetches live `flight_windows` + `inventory_availability` and passes through. Config values are fallbacks only.

Remaining:
- `TEST_INVENTORY` in `page.tsx` — still used when a species has no `inventory_availability` row for the current window
- "A$35/kg" in `StickyOrderBar.tsx`, `ProcessSteps.tsx` — still static text (not species-specific)
