# FijiFish Webapp — Product Specification v3.0

## Changelog
- v1.0: Initial spec (buyer, supplier, admin)
- v2.0: Added Clerk, driver role, WorldView HUD, route optimisation, communal delivery
- v3.0: Added multi-village supplier architecture, broadcast SMS, live scarcity (capacity bar + timer), Australia-only purchasing, village impact stories, updated data model

---

## 1. WHAT THIS APP IS

A real-time seafood ordering and tracking platform connecting Fijian fishing villages with buyers in Australia. The app is a **live catch-to-customer tracking system** with built-in scarcity — buyers see exactly how much fish is left and how much time remains before the order window closes for the next flight.

Each village that joins the platform gets its own identity and impact story. Customers aren't just buying fish — they're supporting a specific village. "Your order this week supported fishermen in Galoa, Bua" is core to the brand.

UI follows a **WorldView-inspired HUD aesthetic** — dark theme, tactical real-time data, map-centric. See `/worldview-ui` skill for full design system.

---

## 2. USER ROLES (4 roles via Clerk)

### BUYER (customer in Australia or viewing from overseas)
- Browse seasonal fish with live capacity bars + countdown timers
- Purchase ONLY if in Australia (Stripe AUD)
- Overseas users: view catalogue and prices in local currency, but cannot checkout
- Track shipment in real-time including live flight tracking
- See which village their fish comes from

### SUPPLIER (village operator — cousin in Galoa, future village contacts)
- One supplier account per village
- Post photos of fresh catch
- Confirm availability, flag seasons
- Update shipment status (packed → at airport → cargo accepted)
- See only their village's orders, not other villages
- See prices in FJD
- Mobile-first, works on slow 3G/4G

### DRIVER (delivery driver in Australia)
- View optimised delivery route (nearest-customer-first)
- Photo proof at each stop, tick off orders
- Handle communal deliveries (2+ customers at one address) with admin escalation
- Track distance travelled

### ADMIN (Jovi)
- Full control over everything
- Set capacity per species per village per flight window
- Approve catch photos → triggers buyer notifications
- Broadcast messages to customers (by state, zone, segment)
- Manage villages — onboard new supply villages, update impact stories
- Monitor all suppliers, drivers, orders, revenue, customer analytics

---

## 3. AUTHENTICATION (Clerk)

### Roles in Clerk publicMetadata:
```json
{ "role": "buyer" }
{ "role": "supplier", "village_id": "galoa-bua" }
{ "role": "driver" }
{ "role": "admin" }
```

Supplier accounts include `village_id` so the portal filters to their village only.

### Route protection:
```
/                     → public
/fish, /fish/[id]     → public
/villages, /villages/[id] → public
/about                → public
/order, /account      → buyer (AU only for checkout) + admin
/supplier/*           → supplier + admin
/driver/*             → driver + admin
/admin/*              → admin only
/track/[order-id]     → authenticated (own orders for buyers)
```

### Purchase restriction:
- Stripe checkout button ONLY renders if user's country is Australia
- Non-AU users see: "Available for delivery in Australia only" + WhatsApp link for enquiries
- Detection: Clerk profile `country_code` → browser locale → IP fallback
- Fiji users see FJD prices, all other overseas users see AUD prices (display only)

### Clerk → Supabase sync:
- Webhook on `user.created` → insert into `users` table with clerk_id, role, village_id (if supplier)
- Webhook on `user.updated` → update matching row
- Supabase RLS policies check Clerk userId from JWT

---

## 4. LIVE SCARCITY SYSTEM (Capacity + Timer)

This is the core commercial mechanic. Both signals are REAL constraints, not artificial urgency.

### 4.1 Capacity Bar
Each species in each flight window has a total capacity set by admin:
```
inventory_availability:
  fish_species_id
  flight_window_id
  village_id            ← which village is supplying this
  total_capacity_kg     ← admin sets (e.g. 100kg walu from Galoa)
  reserved_kg           ← sum of confirmed orders (auto-calculated)
  available_kg          ← total_capacity_kg - reserved_kg (auto-calculated)
  price_aud_cents
  price_fjd_cents
```

**What buyers see:**
```
██████████░░░░░░  72kg left of 100kg
```

- Progress bar fills as capacity is consumed
- Updates in real-time via Supabase real-time subscriptions
- When available_kg hits 0: species shows "SOLD OUT" badge, add button hidden
- Other species in the same window may still have capacity
- Admin can adjust total_capacity_kg mid-window (cousin calls and says less available)
  → available_kg recalculates → all connected browsers update instantly

### 4.2 Countdown Timer
Each flight window has open and close times:
```
flight_windows:
  order_open_at      ← when buyers can start ordering
  order_close_at     ← hard deadline
```

**What buyers see:**
```
⏰ Orders close in: 1d 14h 23m 07s
✈️ Next flight: Wednesday 16 April
```

- Timer counts down to order_close_at
- At 6 hours remaining: status changes to "closing_soon", banner turns amber
- At 0: window closes, all species become unorderable regardless of remaining capacity
- Order summary auto-sent to assigned supplier village

### 4.3 Combined display per fish card:
```
┌─────────────────────────────────────────────┐
│  [catch photo]                              │
│                                             │
│  🐟 Walu (Spanish Mackerel)                │
│  From Galoa Village, Bua                    │
│                                             │
│  A$40/kg                                    │
│                                             │
│  ██████████░░░░  72kg left of 100kg         │
│                                             │
│  ⏰ Orders close in: 1d 14h 23m             │
│                                             │
│  [ Add to Order — 1kg ]  [+] [-]           │
└─────────────────────────────────────────────┘
```

When sold out:
```
│  ████████████████  SOLD OUT                 │
│                                             │
│  ⏰ Next window opens: Saturday 19 April    │
```

### 4.4 Real-time updates
- Use Supabase Realtime subscriptions on `inventory_availability` table
- When any buyer places an order → `reserved_kg` increases → all browsers see capacity drop
- When admin adjusts `total_capacity_kg` → all browsers update
- No polling — websocket push only

---

## 5. MULTI-VILLAGE SUPPLIER ARCHITECTURE

### 5.1 Village as a supply node
Each village that joins the network is a self-contained supply unit:

```
villages
  id
  name (e.g. "Galoa")
  province (e.g. "Bua")
  island (e.g. "Vanua Levu")
  description (village story — who they are, how fishing supports them)
  impact_summary (what FijiFish revenue has helped fund)
  hero_image_url (village photo — beach, boats, community)
  gallery_urls (json array of additional photos)
  location_lat, location_lng (for map pin)
  is_active (boolean — only active villages show on platform)
  onboarded_at
  contact_name (primary contact in village)
  contact_phone
```

### 5.2 Launch: Galoa only
- One village active at launch
- Supplier portal filtered to Galoa orders/capacity
- All fish cards show "From Galoa Village, Bua"

### 5.3 Expansion: adding villages
When a new village joins (e.g. Druadrua):
1. Admin creates village record with name, story, photos
2. Admin creates Clerk account for village contact (supplier role, village_id: "druadrua")
3. Admin sets capacity for Druadrua species in upcoming flight windows
4. Druadrua fish appears on storefront alongside Galoa fish
5. Buyers can see which village each fish comes from

### 5.4 Supplier sees only their village
When cousin in Galoa logs in, he sees:
- "Orders for Galoa: 50kg walu, 20kg trevally for Wednesday"
- NOT Druadrua's orders

When Druadrua contact logs in:
- "Orders for Druadrua: 30kg kawakawa for Wednesday"
- NOT Galoa's orders

Admin sees everything across all villages.

### 5.5 Village impact page (public)
```
/villages           → grid of all active villages with hero photos
/villages/galoa     → Galoa's story, photos, impact updates, what species they supply
```

Each village page shows:
- Village name, province, island
- Hero photo + gallery
- Story (who they are, their fishing traditions)
- Impact: "Revenue from FijiFish has supported: new ice machine, school supplies, boat engine repair"
- Species they supply (with season indicators)
- Map showing village location

Admin updates impact stories via admin panel as milestones happen.

---

## 6. BROADCAST MESSAGING

### 6.1 Admin broadcast panel
Admin can send messages to customer segments via SMS, WhatsApp, or both.

### 6.2 Audience segments:
- All customers
- By state (NSW, ACT, VIC, QLD — derived from delivery zone)
- By delivery zone (Wagga only, Griffith only, etc.)
- Ordered this month (active buyers)
- Inactive 30+ days (win-back)
- New customers (registered but never ordered)

### 6.3 Message composer:
- Text field with character counter (160 chars = 1 SMS segment)
- Channel selector: SMS / WhatsApp / Both
- Audience selector (dropdown with counts)
- Preview before send
- Confirmation: "This will send [N] messages. Estimated cost: A$[X]. Confirm?"
- Rate limit: max 1 broadcast per day (admin can override)

### 6.4 Use cases:
- "Vinaka vakalevu! Your orders this month funded a new ice machine for Galoa village 🐟🇫🇯"
- "Fresh walu and lobster arriving Wednesday. Order now: fijifish.com.au"
- "Lobster season is here! Limited stock — first come first served"
- "No delivery this week due to cyclone season. Back next Wednesday. Stay safe 🌊"
- "Welcome Druadrua village to the FijiFish family! Kawakawa now available"

### 6.5 Compliance (Spam Act 2003):
- Every message includes sender ID (FijiFish)
- Every message includes: "Reply STOP to unsubscribe"
- Unsubscribes processed automatically → `customers.broadcast_opt_out = true`
- Opted-out customers excluded from all future broadcasts
- Consent collected at signup: checkbox "I'd like to receive updates about FijiFish and the communities we support"
- Records of consent retained (Clerk signup timestamp + checkbox value)

### 6.6 Data model:
```
broadcasts
  id
  sent_by (admin clerk_id)
  audience_filter (jsonb — e.g. {"state": "NSW"} or {"all": true})
  channels (sms / whatsapp / both)
  message_text
  recipient_count
  estimated_cost_aud_cents
  sent_at
  status (draft / sending / sent / failed)

broadcast_recipients
  id
  broadcast_id
  customer_id
  channel_used (sms / whatsapp)
  delivery_status (queued / sent / delivered / failed / unsubscribed)
  sent_at

customers (additional fields):
  broadcast_opt_in (boolean, default true — set at signup)
  broadcast_opt_out (boolean, default false — set by STOP reply)
  state (derived from delivery zone: NSW, ACT, etc.)
```

---

## 7. BUYER JOURNEY (updated)

### 7.1 Onboarding
1. Landing page → "Order Now" CTA
2. Clerk signup: name, email, phone
3. Profile completion (post-signup page):
   - Delivery address + zone (dropdown)
   - Nationality (required)
   - How did you hear about us? (optional)
   - Preferred notification channel (SMS / WhatsApp / Email)
   - ☑ "I'd like to receive updates about FijiFish and the communities we support" (broadcast consent)
4. Country detection: if AU → full purchase access. If not AU → view-only mode.

### 7.2 Browse + Order
- Homepage: seasonal fish grid with capacity bars + countdown timer
- Each card shows village of origin ("From Galoa Village, Bua")
- Prices in AUD (AU users) or FJD (Fiji users) or AUD (all others, display only)
- Non-AU users: "Available for delivery in Australia only" instead of add-to-cart button
- Cart → Stripe checkout (AUD only) → confirmation

### 7.3 Real-time Tracking (9 steps)
```
1. ORDER CONFIRMED ✅
2. FISH CAUGHT 🐟 [approved catch photo from village]
3. PACKED & SEALED 📦
4. AT LABASA AIRPORT ✈️
5. ON THE PLANE 🛫 [FlightRadar24 live embed]
6. LANDED IN CANBERRA 🛬
7. CUSTOMS CLEARED ✅
8. OUT FOR DELIVERY 🚚 [driver map + ETA]
9. DELIVERED 🎉 [delivery photo proof, rate + feedback]
```

Each step triggers notification via preferred channel.

---

## 8. SUPPLIER PORTAL (updated for multi-village)

Mobile-first, 3G-friendly, big buttons.

### 8.1 Login
- Phone OTP via Clerk
- Clerk metadata includes `village_id` → portal auto-filters to their village

### 8.2 Home screen
- "Orders for [Village Name]: 50kg walu, 20kg trevally for Wednesday"
- Shows only this village's allocation, not other villages
- Big buttons: "Post Catch Photo" / "Update Status"

### 8.3 Catch photos
- Camera → species → weight → note → submit for admin approval

### 8.4 Status updates
- Sequential tap buttons: Catch received → Processing → Packed → At Airport → Cargo accepted
- Each triggers admin notification. Admin approves. Buyers notified.

### 8.5 Season flags
- "Walu good right now" / "Lobster spawning, not catching"
- Goes to admin for approval

---

## 9. DRIVER PORTAL (unchanged from v2)

See v2 spec sections 6.1-6.7 for full driver flow:
- Optimised route (nearest-stop-first)
- Photo proof mandatory at every stop
- Communal delivery detection (50m GPS radius) + admin escalation
- GPS logging + distance tracking
- Offline caching for rural Riverina dead zones

---

## 10. ADMIN PANEL (updated)

### 10.1 Dashboard (WorldView HUD)
- Real-time map: shipment location, driver position, customer pins, village pins
- Revenue counters (this week / month / year)
- Active window: capacity bars per species, timer, order count
- Village performance: orders per village, revenue per village

### 10.2 Catch Photo Approval
- Feed from all villages (filterable by village)
- Approve → buyer notification with photo

### 10.3 Price + Capacity Management
- Per species, per village, per flight window
- Set: total_capacity_kg, price_aud_cents, price_fjd_cents
- Adjust mid-window: capacity changes reflect live on storefront

### 10.4 Flight Windows
- Create, open, close, cancel
- Assign villages to windows (which villages are supplying this flight)
- One-click: send order summary to each village's supplier

### 10.5 Broadcast Messages
- Compose → select audience segment → select channel → preview → confirm → send
- View broadcast history + delivery stats

### 10.6 Village Management
- Add new village (name, story, photos, contact)
- Edit impact stories (what revenue has funded)
- Activate/deactivate villages
- View per-village stats (orders, revenue, species supplied)

### 10.7 Delivery Runs
- Create run → assign driver → system generates optimised route
- Monitor driver in real-time
- Review delivery proofs
- Approve/investigate communal deliveries

### 10.8 Customer Management
- All customers with Clerk profile data
- Filter by: state, zone, nationality, order frequency, spend
- Export CSV
- View individual: name, phone, nationality, orders, ratings, broadcast opt-in status

### 10.9 Communal Delivery Escalations
- Queue of flagged proxy/communal deliveries
- Photo proof, GPS, driver's note
- Approve or investigate

### 10.10 Species, Seasons, Zones
- CRUD for all reference data

---

## 11. COMPLETE DATA MODEL v3

```
-- USERS & ROLES (synced from Clerk)
users
  id UUID PRIMARY KEY
  clerk_id TEXT UNIQUE
  role TEXT CHECK (role IN ('buyer','supplier','driver','admin'))
  full_name TEXT
  email TEXT
  phone TEXT
  country_code TEXT  -- AU, FJ, NZ, etc.
  created_at TIMESTAMPTZ
  updated_at TIMESTAMPTZ

customers
  id UUID PRIMARY KEY
  user_id UUID REFERENCES users
  nationality TEXT
  delivery_address TEXT
  delivery_address_lat DECIMAL
  delivery_address_lng DECIMAL
  delivery_zone_id UUID REFERENCES delivery_zones
  preferred_notification_channel TEXT CHECK (channel IN ('sms','whatsapp','email'))
  referral_source TEXT
  broadcast_opt_in BOOLEAN DEFAULT true
  broadcast_opt_out BOOLEAN DEFAULT false
  state TEXT  -- NSW, ACT, VIC, QLD (derived from zone)
  created_at TIMESTAMPTZ

suppliers
  id UUID PRIMARY KEY
  user_id UUID REFERENCES users
  village_id UUID REFERENCES villages
  is_active BOOLEAN DEFAULT true

drivers
  id UUID PRIMARY KEY
  user_id UUID REFERENCES users
  vehicle_description TEXT
  is_active BOOLEAN DEFAULT true

-- VILLAGES
villages
  id UUID PRIMARY KEY
  name TEXT  -- Galoa
  province TEXT  -- Bua
  island TEXT  -- Vanua Levu
  description TEXT  -- village story
  impact_summary TEXT  -- what revenue has funded
  hero_image_url TEXT
  gallery_urls JSONB  -- array of photo URLs
  location_lat DECIMAL
  location_lng DECIMAL
  contact_name TEXT
  contact_phone TEXT
  is_active BOOLEAN DEFAULT false  -- only active villages visible
  onboarded_at TIMESTAMPTZ
  created_at TIMESTAMPTZ
  updated_at TIMESTAMPTZ

-- FISH & SEASONS
fish_species
  id UUID PRIMARY KEY
  name_fijian TEXT
  name_english TEXT
  name_scientific TEXT
  description TEXT
  cooking_suggestions TEXT
  default_image_url TEXT
  is_active BOOLEAN DEFAULT true

seasons
  id UUID PRIMARY KEY
  fish_species_id UUID REFERENCES fish_species
  month_start INT  -- 1-12
  month_end INT  -- 1-12 (handles wrap-around e.g. 11→2)
  notes TEXT

-- FLIGHT WINDOWS & INVENTORY
flight_windows
  id UUID PRIMARY KEY
  flight_date DATE
  flight_number TEXT
  labasa_departure_time TIMESTAMPTZ
  nadi_departure_time TIMESTAMPTZ
  canberra_arrival_time TIMESTAMPTZ
  order_open_at TIMESTAMPTZ
  order_close_at TIMESTAMPTZ
  status TEXT CHECK (status IN ('upcoming','open','closing_soon','closed','packing','shipped','in_transit','landed','customs','delivering','delivered','cancelled'))
  status_updated_at TIMESTAMPTZ
  notes TEXT

inventory_availability
  id UUID PRIMARY KEY
  fish_species_id UUID REFERENCES fish_species
  flight_window_id UUID REFERENCES flight_windows
  village_id UUID REFERENCES villages  -- which village supplies this
  total_capacity_kg DECIMAL  -- admin sets
  reserved_kg DECIMAL DEFAULT 0  -- sum of confirmed orders
  available_kg DECIMAL GENERATED ALWAYS AS (total_capacity_kg - reserved_kg) STORED
  price_aud_cents INT
  price_fjd_cents INT
  confirmed_by_supplier BOOLEAN DEFAULT false
  confirmed_at TIMESTAMPTZ

delivery_zones
  id UUID PRIMARY KEY
  name TEXT  -- Wagga Wagga, Griffith, etc.
  state TEXT  -- NSW, ACT
  delivery_fee_aud_cents INT
  min_order_aud_cents INT
  zone_lat DECIMAL
  zone_lng DECIMAL
  is_active BOOLEAN DEFAULT true

-- ORDERS
orders
  id UUID PRIMARY KEY
  customer_id UUID REFERENCES customers
  flight_window_id UUID REFERENCES flight_windows
  delivery_zone_id UUID REFERENCES delivery_zones
  delivery_run_id UUID REFERENCES delivery_runs  -- nullable until assigned
  status TEXT CHECK (status IN ('pending','confirmed','paid','cancelled','refunded','out_for_delivery','delivered'))
  total_aud_cents INT
  delivery_fee_aud_cents INT
  stripe_payment_intent_id TEXT
  placed_at TIMESTAMPTZ
  delivered_at TIMESTAMPTZ
  rating INT CHECK (rating BETWEEN 1 AND 5)
  feedback_text TEXT

order_items
  id UUID PRIMARY KEY
  order_id UUID REFERENCES orders
  fish_species_id UUID REFERENCES fish_species
  village_id UUID REFERENCES villages  -- which village this item comes from
  quantity_kg DECIMAL
  price_per_kg_aud_cents INT
  price_per_kg_fjd_cents INT

-- CATCH PHOTOS
catch_photos
  id UUID PRIMARY KEY
  supplier_id UUID REFERENCES suppliers
  village_id UUID REFERENCES villages
  fish_species_id UUID REFERENCES fish_species
  flight_window_id UUID REFERENCES flight_windows
  image_url TEXT
  estimated_weight_kg DECIMAL
  note TEXT
  status TEXT CHECK (status IN ('pending','approved','rejected'))
  approved_by UUID REFERENCES users
  approved_at TIMESTAMPTZ
  created_at TIMESTAMPTZ

-- SHIPMENT TRACKING
shipment_updates
  id UUID PRIMARY KEY
  flight_window_id UUID REFERENCES flight_windows
  village_id UUID REFERENCES villages  -- which village's shipment
  status TEXT CHECK (status IN ('caught','processing','packed','at_airport','cargo_accepted','departed','in_flight','landed','customs_cleared','out_for_delivery','delivered'))
  updated_by UUID REFERENCES users
  photo_url TEXT
  note TEXT
  requires_admin_approval BOOLEAN DEFAULT false
  admin_approved BOOLEAN
  admin_approved_by UUID REFERENCES users
  admin_approved_at TIMESTAMPTZ
  created_at TIMESTAMPTZ

-- DELIVERY
delivery_runs
  id UUID PRIMARY KEY
  flight_window_id UUID REFERENCES flight_windows
  driver_id UUID REFERENCES drivers
  status TEXT CHECK (status IN ('planned','active','completed'))
  started_at TIMESTAMPTZ
  completed_at TIMESTAMPTZ
  total_distance_km DECIMAL
  total_duration_minutes INT
  stop_count INT
  created_by UUID REFERENCES users

delivery_stops
  id UUID PRIMARY KEY
  delivery_run_id UUID REFERENCES delivery_runs
  order_id UUID REFERENCES orders
  customer_id UUID REFERENCES customers
  sequence_number INT  -- optimised order
  address TEXT
  lat DECIMAL
  lng DECIMAL
  status TEXT CHECK (status IN ('pending','arrived','delivered','skipped','escalated'))
  arrived_at TIMESTAMPTZ
  delivered_at TIMESTAMPTZ
  is_communal BOOLEAN DEFAULT false
  communal_group_id UUID  -- links stops at same address
  notes TEXT

delivery_proofs
  id UUID PRIMARY KEY
  delivery_stop_id UUID REFERENCES delivery_stops
  order_id UUID REFERENCES orders
  photo_url TEXT
  gps_lat DECIMAL
  gps_lng DECIMAL
  captured_at TIMESTAMPTZ
  received_by_name TEXT  -- who physically received
  is_proxy_delivery BOOLEAN DEFAULT false
  admin_approval_required BOOLEAN DEFAULT false
  admin_approved BOOLEAN
  admin_approved_by UUID REFERENCES users
  admin_approved_at TIMESTAMPTZ
  admin_note TEXT

driver_gps_logs
  id UUID PRIMARY KEY
  delivery_run_id UUID REFERENCES delivery_runs
  driver_id UUID REFERENCES drivers
  lat DECIMAL
  lng DECIMAL
  captured_at TIMESTAMPTZ

-- BROADCASTS
broadcasts
  id UUID PRIMARY KEY
  sent_by UUID REFERENCES users
  audience_filter JSONB  -- {"state":"NSW"} or {"zone_id":"..."} or {"all":true}
  channels TEXT  -- sms / whatsapp / both
  message_text TEXT
  recipient_count INT
  estimated_cost_aud_cents INT
  sent_at TIMESTAMPTZ
  status TEXT CHECK (status IN ('draft','sending','sent','failed'))

broadcast_recipients
  id UUID PRIMARY KEY
  broadcast_id UUID REFERENCES broadcasts
  customer_id UUID REFERENCES customers
  channel_used TEXT
  delivery_status TEXT CHECK (status IN ('queued','sent','delivered','failed','unsubscribed'))
  sent_at TIMESTAMPTZ

-- NOTIFICATIONS LOG
notification_log
  id UUID PRIMARY KEY
  customer_id UUID REFERENCES customers
  event TEXT  -- window_open, order_confirmed, fish_caught, etc.
  channel TEXT  -- sms / whatsapp / email
  message_text TEXT
  delivery_status TEXT
  sent_at TIMESTAMPTZ
```

---

## 12. TECH STACK

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router) + TypeScript |
| Auth | Clerk (4 roles, phone OTP, webhooks) |
| Styling | Tailwind CSS (WorldView dark theme) |
| Database | Supabase (AU region) + Realtime subscriptions |
| Payments | Stripe (AUD only, AU buyers only) |
| Images | Supabase Storage |
| Notifications | Twilio (SMS + WhatsApp) |
| Maps | Mapbox GL JS (dark tiles, route display, driver tracking) |
| Route optimisation | Mapbox Directions API |
| Geocoding | Mapbox Geocoding API |
| Flight tracking | FlightRadar24 embed (Phase 1) |
| Hosting | Vercel |

---

## 13. PAGES (Site Map)

### Public:
- `/` — Landing (hero, seasonal fish with scarcity bars, countdown, village showcase)
- `/fish` — Catalogue (grid with capacity + timer)
- `/fish/[id]` — Detail (photo, village origin, cooking tips)
- `/villages` — All active villages (grid with hero photos)
- `/villages/[slug]` — Village story, impact, species, photos, map
- `/about` — Platform story, sustainability

### Buyer:
- `/order` — Cart + Stripe checkout (AU only)
- `/account` — Profile, orders, preferences
- `/track/[order-id]` — 9-step tracking with flight + delivery map

### Supplier:
- `/supplier` — Village order summary
- `/supplier/catch` — Post catch photo
- `/supplier/status` — Update shipment status
- `/supplier/season` — Flag availability

### Driver:
- `/driver` — Active run overview
- `/driver/run/[id]` — Route map + checklist
- `/driver/run/[id]/stop/[id]` — Delivery (photo, tick-off, communal)
- `/driver/history` — Past runs + stats

### Admin:
- `/admin` — HUD dashboard
- `/admin/photos` — Catch photo approval
- `/admin/prices` — Capacity + AUD/FJD prices per village per window
- `/admin/windows` — Flight window management
- `/admin/orders` — All orders
- `/admin/villages` — Village management + impact stories
- `/admin/broadcast` — Compose + send + history
- `/admin/customers` — Analytics + CSV export
- `/admin/drivers` — Driver management
- `/admin/runs` — Delivery run creation + monitoring
- `/admin/escalations` — Communal delivery approvals

---

## 14. UI/UX: WORLDVIEW HUD

See `/worldview-ui` skill for complete design system. Key principles:
- Dark theme (#0a0f1a) for admin, driver, buyer, tracking
- Light theme ONLY for supplier portal (Fiji outdoor phone use)
- Ocean teal (#4fc3f7) primary accent
- Map is always the hero, not a sidebar
- IBM Plex Mono for data/numbers, Plus Jakarta Sans for body
- Capacity bars: teal fill on dark bg, amber when <20% remaining, red when sold out
- Countdown timer: monospace digits, subtle pulse animation on last 6 hours

---

## 15. BUILD PHASES

### Phase 0 — Foundation (Session 1-2)
- [ ] Next.js 16 + Tailwind + TypeScript scaffold
- [ ] Clerk integration (4 roles, webhook sync)
- [ ] Supabase project (AU region) + full v3 migration
- [ ] Seed: Galoa village, 5-7 species, seasons, delivery zones, test window
- [ ] GitHub + Vercel deploy

### Phase 1a — Buyer + Scarcity (Session 3-6)
- [ ] Landing page (WorldView dark, seasonal fish, scarcity bars, countdown)
- [ ] Fish catalogue with live capacity + timer
- [ ] Village origin labels on fish cards
- [ ] Buyer registration + profile completion
- [ ] AU-only purchase restriction
- [ ] Cart + Stripe checkout
- [ ] Supabase Realtime for live capacity updates

### Phase 1b — Admin Core (Session 7-9)
- [ ] Admin dashboard (HUD)
- [ ] Capacity + price management per village per species per window
- [ ] Flight window management
- [ ] Species + season + zone CRUD
- [ ] Village management (add, edit story, photos, activate)
- [ ] Order management + customer list

### Phase 1c — Supplier Portal (Session 10-11)
- [ ] Supplier login (phone OTP, village-filtered)
- [ ] Catch photo upload → admin approval → buyer notification
- [ ] Shipment status updates
- [ ] Season flags

### Phase 2a — Tracking + Notifications (Session 12-15)
- [ ] 9-step tracking page with FlightRadar24 embed
- [ ] Twilio SMS + WhatsApp integration
- [ ] All notification triggers
- [ ] Broadcast messaging (admin panel)

### Phase 2b — Driver Portal (Session 16-19)
- [ ] Driver auth + role
- [ ] Delivery run creation (admin)
- [ ] Route optimisation (nearest-stop, Mapbox)
- [ ] Delivery checklist with photo proof
- [ ] Communal detection + handling + admin escalation
- [ ] GPS logging + distance tracking

### Phase 2c — Geo-Pricing (Session 20)
- [ ] FJD display for Fiji users
- [ ] Overseas view-only mode
- [ ] Village impact pages (public)

### Phase 3 — Polish (Session 21-23)
- [ ] Mobile responsive audit
- [ ] SEO
- [ ] Rating + feedback system
- [ ] Customer analytics (nationality, zone heatmap)
- [ ] Legal pages
- [ ] Performance (image compression, 3G testing)
- [ ] PWA (add to homescreen)

---

## 16. WHAT WE ARE NOT BUILDING

- No Fiji payments Phase 1 (FJD display only)
- No multi-language Phase 1 (Fijian Phase 3)
- No automated flight status (manual Phase 1)
- No subscription orders (Phase 3)
- No wholesale restaurant portal (Phase 3)
- No native mobile app (responsive web + PWA)
- No AI route optimisation (simple nearest-neighbour)
- No individual fisherman accounts (supplier = village level)

---

## 17. OPEN QUESTIONS (5 remaining)

1. **Delivery zones per flight:** All zones same day, or split?
2. **Minimum order:** Per customer? Per zone?
3. **Lobster:** By piece or by kg?
4. **Refund policy:** Full refund, credit, or partial?
5. **Domain name?**

---

## APPROVAL

This is the source of truth. No code is written that isn't in this spec.
