---
name: db-integrity
description: SQL query templates for DB Steward integrity checks. Load when running /db-check or /db-fix. Covers schema drift, duplicates, stale status, orphaned rows, RLS, seed data, and capacity integrity.
allowed-tools: mcp__supabase__execute_sql, mcp__supabase__list_tables
---

# DB Integrity — SQL Check Templates

All queries are SELECT-only (read-safe). Run via `mcp__supabase__execute_sql`.
For each check: run the query, evaluate the result, report PASS / WARN / FAIL.

---

## 1. Schema drift

Compare live table columns against expected. Run once per key table.

```sql
-- List all columns for a table (replace 'flight_windows' with target table):
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'flight_windows'
ORDER BY ordinal_position;
```

**Expected columns for `flight_windows`:**
`id, flight_date, flight_number, labasa_departure_time, nadi_departure_time, canberra_arrival_time, order_open_at, order_close_at, status, status_updated_at, notes, created_at`

**Expected columns for `inventory_availability`:**
`id, flight_window_id, fish_species_id, village_id, total_capacity_kg, reserved_kg, available_kg (computed view or column), price_aud_cents, price_fjd_cents, confirmed_by_supplier, created_at, updated_at`

**Expected columns for `orders`:**
`id, customer_id, flight_window_id, status, total_aud_cents, delivery_address, delivery_notes, stripe_payment_intent_id, delivery_run_id, created_at, updated_at`

**PASS:** All expected columns present with correct types.
**WARN:** Extra column found (may be from unapplied migration or Dashboard edit).
**FAIL:** Expected column missing — code will break.

---

## 2. Duplicate flight windows

`flight_date` should be unique. Duplicates cause the hook to return wrong state.

```sql
SELECT flight_date, COUNT(*) as cnt, array_agg(id ORDER BY created_at) as ids
FROM flight_windows
GROUP BY flight_date
HAVING COUNT(*) > 1
ORDER BY flight_date;
```

**PASS:** Empty result.
**FAIL:** Any rows returned — show all duplicate ids, propose keeping oldest (first in array).

---

## 3. Stale status — flight_windows

Stored `status` should match time-derived status. Mismatches cause banner to show wrong state.
(Time-driven states only: upcoming/open/closing_soon/closed — admin states packing→delivered are intentional.)

```sql
SELECT
  id,
  flight_date,
  status AS stored_status,
  order_open_at,
  order_close_at,
  now() AT TIME ZONE 'UTC' AS now_utc,
  CASE
    WHEN status IN ('packing','shipped','in_transit','landed','customs','delivering','delivered','cancelled')
      THEN 'admin-driven (skip)'
    WHEN now() < order_open_at
      THEN 'upcoming'
    WHEN now() < (order_close_at - INTERVAL '6 hours')
      THEN 'open'
    WHEN now() < order_close_at
      THEN 'closing_soon'
    ELSE 'closed'
  END AS derived_status
FROM flight_windows
WHERE status NOT IN ('packing','shipped','in_transit','landed','customs','delivering','delivered','cancelled')
ORDER BY order_open_at;
```

**PASS:** `stored_status = derived_status` for all time-driven rows.
**WARN:** Status is 'open' but `derived_status` is 'closed' — window has passed but status not updated (non-blocking; time logic is authoritative).
**FAIL:** Status is 'upcoming' but `derived_status` is 'open' and it's been open > 2h — buyers may see wrong banner.

---

## 4. Stale order status

Orders stuck in `pending` for > 2 hours (Stripe likely already confirmed them).

```sql
SELECT id, customer_id, status, total_aud_cents, stripe_payment_intent_id, created_at, updated_at
FROM orders
WHERE status = 'pending'
  AND created_at < now() - INTERVAL '2 hours'
ORDER BY created_at DESC
LIMIT 10;
```

**PASS:** Empty result.
**WARN:** Rows found with `stripe_payment_intent_id` set — webhook may have failed; investigate Stripe dashboard.
**WARN:** Rows found without `stripe_payment_intent_id` — user abandoned checkout; normal.

---

## 5. Orphaned order_items

`order_items` pointing to orders that no longer exist.

```sql
SELECT oi.id, oi.order_id, oi.fish_species_id, oi.quantity_kg
FROM order_items oi
LEFT JOIN orders o ON o.id = oi.order_id
WHERE o.id IS NULL
LIMIT 10;
```

**PASS:** Empty result.
**FAIL:** Any rows returned — these are phantom items that inflate inventory reservation counts. Propose DELETE.

---

## 6. Orphaned inventory_availability

`inventory_availability` pointing to flight_windows that no longer exist.

```sql
SELECT ia.id, ia.flight_window_id, ia.fish_species_id
FROM inventory_availability ia
LEFT JOIN flight_windows fw ON fw.id = ia.flight_window_id
WHERE fw.id IS NULL
LIMIT 10;
```

**PASS:** Empty result.
**FAIL:** Any rows returned — propose DELETE.

---

## 7. RLS enabled

Every customer-facing table must have row-level security enabled.

```sql
SELECT c.relname AS table_name, c.relrowsecurity AS rls_enabled
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relname IN (
    'users', 'customers', 'orders', 'order_items',
    'flight_windows', 'inventory_availability', 'fish_species',
    'seasons', 'villages', 'delivery_zones', 'fish_interest_votes',
    'customer_feedback', 'delivery_demand_votes', 'impact_stories',
    'catch_batches', 'village_media', 'catch_photos', 'shipment_updates',
    'delivery_runs', 'delivery_stops', 'delivery_proofs', 'driver_gps_logs',
    'notification_log', 'broadcasts', 'broadcast_recipients'
  )
ORDER BY c.relname;
```

**PASS:** All `rls_enabled = true`.
**FAIL:** Any `rls_enabled = false` — migration 015 may not be applied. Report which tables.

---

## 8. RLS policies

Every table with RLS should have at least one policy. A table with RLS on but no policies blocks ALL access.

```sql
SELECT tablename, COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;
```

Cross-reference with check 7. Any table where `rls_enabled = true` but has no policy in this result = **FAIL** (complete lockout).

**PASS:** All RLS-enabled tables appear in this query with count ≥ 1.
**FAIL:** RLS-enabled table missing from results — no policies, all queries return empty.

---

## 9. Null violations

Columns declared NOT NULL but potentially containing NULLs from direct Dashboard edits.

```sql
-- Check flight_windows for nulls in required columns:
SELECT id, flight_date, order_open_at, order_close_at, status
FROM flight_windows
WHERE flight_date IS NULL
   OR order_open_at IS NULL
   OR order_close_at IS NULL
   OR status IS NULL;

-- Check orders for nulls in required columns:
SELECT id, customer_id, flight_window_id, status, total_aud_cents
FROM orders
WHERE customer_id IS NULL
   OR flight_window_id IS NULL
   OR status IS NULL
   OR total_aud_cents IS NULL;

-- Check inventory_availability:
SELECT id, flight_window_id, fish_species_id, village_id, price_aud_cents
FROM inventory_availability
WHERE fish_species_id IS NULL
   OR village_id IS NULL
   OR price_aud_cents IS NULL;
```

**PASS:** All queries return empty.
**FAIL:** Any rows returned — these rows will cause runtime errors in API routes.

---

## 10. Seed completeness

Expected reference data must be present for the app to function.

```sql
-- Fish species count (expect ≥ 7):
SELECT COUNT(*) as count, COUNT(CASE WHEN is_active THEN 1 END) as active
FROM fish_species;

-- Villages count (expect ≥ 1):
SELECT COUNT(*) as count FROM villages;

-- Delivery zones count (expect ≥ 5):
SELECT COUNT(*) as count FROM delivery_zones;

-- Seasons count (expect ≥ 1 per active species):
SELECT COUNT(*) as count FROM seasons;
```

**PASS:** fish_species ≥ 7 (1 active), villages ≥ 1, delivery_zones ≥ 5.
**WARN:** fish_species active = 0 — fish grid will be empty.
**FAIL:** villages = 0 — supplier portal broken; inventory has no village FK.

---

## 11. Reserved-kg integrity

`reserved_kg` must never exceed `total_capacity_kg` — the atomic RPC should prevent this, but direct edits can bypass it.

```sql
SELECT
  ia.id,
  fs.name_english AS fish,
  ia.total_capacity_kg,
  ia.reserved_kg,
  ia.reserved_kg - ia.total_capacity_kg AS overrun_kg,
  fw.flight_date
FROM inventory_availability ia
JOIN fish_species fs ON fs.id = ia.fish_species_id
JOIN flight_windows fw ON fw.id = ia.flight_window_id
WHERE ia.reserved_kg > ia.total_capacity_kg
ORDER BY overrun_kg DESC;
```

**PASS:** Empty result.
**FAIL:** Any rows — buyers could be charged for fish that doesn't exist. Propose capping `reserved_kg` to `total_capacity_kg`.

---

## 12. Flight window count (storefront liveness)

At least one open or upcoming window must exist for the storefront to show ordering CTAs.

```sql
SELECT
  COUNT(CASE WHEN order_open_at <= now() AND order_close_at > now()
              AND status NOT IN ('packing','shipped','in_transit','landed','customs','delivering','delivered','cancelled')
             THEN 1 END) AS currently_open,
  COUNT(CASE WHEN order_open_at > now()
              AND status NOT IN ('delivered','cancelled')
             THEN 1 END) AS upcoming,
  MIN(CASE WHEN order_open_at > now() THEN order_open_at END) AS next_opens_at
FROM flight_windows;
```

**PASS:** `currently_open ≥ 1` OR `upcoming ≥ 1`.
**WARN:** `currently_open = 0` AND `upcoming ≥ 1` — pre-order mode active (expected behaviour when between windows).
**FAIL:** `currently_open = 0` AND `upcoming = 0` — storefront shows "Next delivery coming soon" with email capture only. Migration 016 may not be applied.

---

## Remediation quick reference

| Check | FAIL action |
|-------|-------------|
| duplicate-flight-windows | Delete newer duplicate(s), keep oldest |
| stale-status | UPDATE status to match derived_status (time-driven only) |
| orphaned-order-items | DELETE orphaned rows |
| orphaned-inventory | DELETE orphaned rows |
| rls-enabled | Apply migration 015 in Supabase SQL Editor |
| rls-policies | Apply migration 015; verify policy names in SQL Editor |
| null-violations | Investigate direct Dashboard edits; fix or delete row |
| seed-completeness | Apply migration 001 seed data if missing |
| reserved-kg-integrity | Cap reserved_kg to total_capacity_kg per row |
| flight-window-count | Apply migration 016 to seed Thursday windows |
