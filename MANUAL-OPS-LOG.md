# FijiFish — Manual Operations Log

Non-code configuration completed outside of version control: dashboards, env vars, DNS, third-party setup.

Use this as a shipping checklist for future projects. Completed tasks include the date where known.

---

## Stripe

| Task | Status | Date |
|------|--------|------|
| Created Stripe account (FijiFish Pacific Seafood, sandbox) | ✅ Done | 2026-04 |
| Created product: **Walu — Fresh from Fiji** (test + live price_id) | ✅ Done | 2026-04 |
| Configured webhook endpoint: `https://vitifish.vercel.app/api/webhooks/stripe` | ✅ Done | 2026-04-14 |
| Registered events: `checkout.session.completed`, `payment_intent.payment_failed`, `charge.refunded` | ✅ Done | 2026-04-14 |
| Webhook signing secret → `STRIPE_WEBHOOK_SECRET` on Vercel | ✅ Done | 2026-04-14 |
| Customer portal activated (Settings → Billing → Customer portal → Activate test link) | ✅ Done | 2026-04-14 |
| Portal URL → `STRIPE_PORTAL_URL` on Vercel | ✅ Done | 2026-04-14 |
| Payment methods enabled: Card, Zip, Klarna, Link (auto-enabled by Stripe) | ✅ Done | 2026-04 |
| Enable PayTo (Settings → Payment methods → PayTo → Enable) | ⬜ Pending | — |
| Switch from sandbox to live mode before launch | ⬜ Pending | — |

### Stripe webhook events registered
```
checkout.session.completed
payment_intent.payment_failed
charge.refunded
```

### To re-run local webhook listener
```
C:\dev\stripe\stripe.exe listen --forward-to localhost:3000/api/webhooks/stripe
```
Local `whsec_xxx` secret is in `.env.local` — **different from the production secret on Vercel.**

---

## Clerk

| Task | Status | Date |
|------|--------|------|
| Created Clerk application (fijifish, Development instance) | ✅ Done | 2026-04 |
| Session token customised: Sessions → Customize session token → `{"metadata": "{{user.public_metadata}}"}` | ✅ Done | 2026-04-14 |
| Admin role set on primary user (`jovilisi@protonmail.com`): Users → Public Metadata → `{"role": "admin"}` | ✅ Done | 2026-04-14 |
| Webhook endpoint registered: `https://vitifish.vercel.app/api/webhooks/clerk` | ✅ Done | 2026-04-14 |
| Webhook events registered: `user.created`, `user.updated`, `user.deleted` | ✅ Done | 2026-04-14 |
| Signing secret → `CLERK_WEBHOOK_SECRET` on Vercel | ✅ Done | 2026-04-14 |
| Sign-in/sign-up URLs configured in env vars | ✅ Done | 2026-04-14 |
| JWT template "supabase" created (Configure → JWT Templates → New template): HS256 signing key = Supabase project JWT secret; claims: `aud=authenticated`, `email={{user.primary_email_address}}`, `role=authenticated` (closes #11) | ✅ Done | 2026-04-16 |
| Live end-to-end test: sign up with burner email → verify Supabase `users` + `customers` rows | ⬜ Pending | — |

### Clerk session token template
Dashboard path: **Configure → Sessions → Customize session token**
```json
{
  "metadata": "{{user.public_metadata}}"
}
```
This injects `role`, `village_id` etc. into the JWT so server-side `getUserRole()` works.

### Clerk JWT template "supabase" (Issue #11 — Clerk JWT → Supabase)
Dashboard path: **Configure → JWT Templates → New template → named "supabase"**
- Signing algorithm: **HS256**
- Signing key: Supabase project JWT secret (found in Supabase Dashboard → Settings → API → JWT Settings → JWT Secret)
- Claims configured:
  ```json
  { "aud": "authenticated", "email": "{{user.primary_email_address}}", "role": "authenticated" }
  ```
- This makes Supabase accept Clerk-issued JWTs: `auth.uid()` resolves to the Clerk user ID, `TO authenticated` RLS policies match, and user-scoped queries enforce correctly on buyer/supplier/driver pages.
- Code wired in `src/lib/supabase-auth.ts` → `getToken({ template: "supabase" })` → `createUserSupabaseClient(token)`.

### Role assignment (manual, per user)
Dashboard path: **Users → [user] → Public metadata**
```json
{ "role": "admin" }
{ "role": "supplier", "village_id": "<uuid>" }
{ "role": "driver" }
```
Default (no metadata set) = `buyer`.

---

## Supabase

| Task | Status | Date |
|------|--------|------|
| Project created: `ubvfdqlqdduwhluqahuk` (AU region, Sydney) | ✅ Done | 2026-04 |
| 12 migrations applied: 001–005, 007–012 (006 intentionally skipped) | ✅ Done | 2026-04-14 |
| Storage buckets created: `catch-photos`, `delivery-proofs`, `village-media`, `qr-labels` | ✅ Done | 2026-04 |
| `delivery-proofs` bucket set to **public** (Storage → delivery-proofs → Make Public) — proof photos viewable by URL; server-side admin role gate still enforces who can trigger uploads (closes #9) | ✅ Done | 2026-04-16 |
| `shipment-updates` bucket set to **public** (Storage → shipment-updates → Make Public) — supplier/admin tracking photos served directly by URL (closes #9 adjacent) | ✅ Done | 2026-04-16 |
| Service role key → `SUPABASE_SERVICE_ROLE_KEY` on Vercel | ✅ Done | 2026-04 |
| Anon key → `NEXT_PUBLIC_SUPABASE_ANON_KEY` on Vercel | ✅ Done | 2026-04 |
| RLS policies on `orders`, `order_items`, `customers` (Issue #8) | ⬜ Pending | — |
| Seed `flight_windows`: FJ911, 2026-04-17, status=open | ✅ Done | 2026-04 |
| Seed `inventory_availability`: 8 rows for FJ911 window | ✅ Done | 2026-04 |

### Applied migrations
| Migration | Description |
|-----------|-------------|
| 001 | Core schema — fish_species, seasons, villages, flight_windows, delivery_zones, customers, orders, order_items, inventory_availability |
| 002 | fish_interest_votes, fish_interest_summary view, customer_feedback |
| 003 | delivery_demand_votes |
| 004 | impact_stories |
| 005 | Storage buckets (catch-photos, delivery-proofs, village-media, qr-labels) |
| ~~006~~ | Skipped intentionally |
| 007 | catch_batches |
| 008 | village_media |
| 009 | `increment_reserved_kg` RPC — atomic capacity reservation at checkout |
| 010 | `payment_failed` status on orders; `decrement_reserved_kg` RPC for capacity restoration |
| 011 | `delivery_address` + `delivery_notes` columns on `orders` |
| 012 | `users.is_active` + `users.deleted_at` — soft-delete support for Clerk webhook |

---

## Vercel

| Task | Status | Date |
|------|--------|------|
| Project created: **vitifish**, team **jovis-projects-e419e68a** | ✅ Done | 2026-04 |
| Connected to GitHub repo: `nocturnaljojo/fijifish`, auto-deploy on push to `main` | ✅ Done | 2026-04 |
| All env vars set (see list below) | ✅ Done | 2026-04-14 |
| Custom domain registration (currently `vitifish.vercel.app`) | ⬜ Pending | — |

### Environment variables set on Vercel
All vars are set for **Production** + **Preview** environments unless noted.

```
# Stripe
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_PORTAL_URL
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

# Supabase
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_SUPABASE_URL

# Clerk
CLERK_SECRET_KEY
CLERK_WEBHOOK_SECRET
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
NEXT_PUBLIC_CLERK_SIGN_IN_URL
NEXT_PUBLIC_CLERK_SIGN_UP_URL
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL

# Mapbox
NEXT_PUBLIC_MAPBOX_TOKEN

# Twilio
TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN    (if set)
TWILIO_PHONE_NUMBER  (if set)
```

> **Note:** `NEXT_PUBLIC_` vars are exposed to the browser bundle. Never add `NEXT_PUBLIC_` to Stripe secret key, Supabase service role key, Clerk secret key, or Twilio credentials.

---

## Stripe CLI (local dev only)

| Task | Status |
|------|--------|
| Downloaded `stripe.exe` to `C:\dev\stripe\` (direct download — not in PATH) | ✅ Done |
| Authenticated to FijiFish Pacific Seafood sandbox (`stripe login`) | ✅ Done |
| Local `.env.local` contains local webhook secret (`whsec_...`) from CLI output | ✅ Done |

```bash
# Start local webhook forwarder (run in a separate terminal before testing checkout)
C:\dev\stripe\stripe.exe listen --forward-to localhost:3000/api/webhooks/stripe
```

The CLI prints a `whsec_xxx` secret that must be set as `STRIPE_WEBHOOK_SECRET` in `.env.local`.
This is **different** from the production Vercel secret. Do not swap them.

---

## Pending manual tasks (pre-launch checklist)

### Immediate
- [ ] **Test Clerk webhook** — sign up with a burner email, verify `users` + `customers` rows appear in Supabase
- [ ] **Test /dashboard** — complete a checkout with Stripe test card, verify order appears in buyer dashboard
- [ ] **Test Stripe Customer Portal** — open `/dashboard/billing`, click "Open Billing Portal", verify Stripe portal loads with prefilled email

### Phase 1b / before soft launch
- [ ] **RLS policies** — add buyer-scoped policies on `orders`, `order_items`, `customers` (Issue #8)
- [ ] **Admin state transitions UI** — build admin panel UI for packing → shipped → ... → delivered flow
- [ ] **Inventory aggregator** — wire `DeliveryBanner` cargo % to live `inventory_availability` total (currently hardcoded in `CARGO_CONFIG`)
- [ ] **Stripe live mode** — complete Stripe business verification, switch keys from `sk_test_` to `sk_live_`, update all Vercel env vars

### Before public launch
- [ ] **Domain registration** — register `fijifish.com.au` or `vitifish.com.au`, point to Vercel
- [ ] **ABN registration** — register Australian Business Number, update `Footer.tsx` with ABN
- [ ] **BICON import permit** — register with DAFF (Dept. of Agriculture) for fish import compliance
- [ ] **Spam Act 2003 compliance audit** — review broadcast feature against opt-out requirements before enabling Twilio
- [ ] **Enable PayTo** — Stripe Dashboard → Settings → Payment methods → PayTo (lower AU bank-transfer fees)
- [ ] **Twilio numbers confirmed** — verify `TWILIO_PHONE_NUMBER` is an SMS-capable AU number

---

## Reference — local dev setup

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Type-check
npm run type-check

# Lint
npm run lint

# Build (production simulation)
npm run build

# Stripe webhook forwarder (separate terminal)
C:\dev\stripe\stripe.exe listen --forward-to localhost:3000/api/webhooks/stripe
```

### Required `.env.local` keys for local dev
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_WEBHOOK_SECRET=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=   ← local whsec_ from Stripe CLI, not production secret
STRIPE_PORTAL_URL=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
NEXT_PUBLIC_MAPBOX_TOKEN=
TWILIO_ACCOUNT_SID=
```
