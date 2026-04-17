Propose and (with explicit approval) execute DB state corrections for issues
flagged by /db-check. Every write requires individual user confirmation.

## Safety protocol — MUST FOLLOW

This command touches live production data. The following rules are absolute:

1. Re-run the relevant check query FIRST — confirm the issue still exists.
2. Show a SELECT preview of the exact rows that would be affected.
3. Show the exact SQL statement (UPDATE / DELETE / INSERT) you intend to run.
4. State the expected outcome clearly (e.g. "deletes 2 duplicate rows, leaves 1").
5. STOP and WAIT for the user to say "approve" or "skip".
6. Execute ONLY on explicit "approve". "ok", "yes", "go" = not explicit — ask again.
7. After execution: re-run the check query to confirm FAIL → PASS.
8. Log the executed statement to SESSIONS.md under "DB fixes applied" with timestamp.
9. NEVER chain operations — one correction, one approval, one verification.
10. NEVER run DDL (ALTER TABLE, DROP, CREATE) — those belong in migrations.

## Workflow

```
for each FAIL in /db-check output:

  1. Re-run check → still failing?
     YES → proceed | NO → mark auto-resolved, skip

  2. Show preview:
     "This will affect N rows:"
     [SELECT result showing affected rows]

  3. Show fix:
     "Proposed SQL:"
     [exact SQL statement]

  4. State outcome:
     "Expected result: [description]"

  5. WAIT for: "approve" / "skip"

  6. On approve: execute → re-run check → confirm resolved

  7. Log:
     "DB fix applied [YYYY-MM-DD HH:MM]: [SQL statement]"
     → append to SESSIONS.md under current session
```

## Common fixes by check

**duplicate-flight-windows**
```sql
-- Preview first:
SELECT id, flight_date, status, created_at
FROM flight_windows
WHERE flight_date = '[date]'
ORDER BY created_at;

-- Then delete the newer duplicate(s), keep oldest:
DELETE FROM flight_windows
WHERE id = '[duplicate-id]';
```

**stale-status** (flight_windows stored status wrong)
```sql
-- Preview:
SELECT id, flight_date, status, order_open_at, order_close_at
FROM flight_windows WHERE id = '[id]';

-- Fix (only for time-driven states — upcoming/open/closing_soon/closed):
UPDATE flight_windows
SET status = '[correct-status]', status_updated_at = now()
WHERE id = '[id]';
```

**reserved-kg-integrity** (reserved > total)
```sql
-- Preview:
SELECT id, fish_species_id, reserved_kg, total_capacity_kg
FROM inventory_availability
WHERE reserved_kg > total_capacity_kg;

-- Fix (cap to total):
UPDATE inventory_availability
SET reserved_kg = total_capacity_kg
WHERE id = '[id]';
```

**flight-window-count** (no upcoming windows — storefront dead-end)
```sql
-- Preview what exists:
SELECT id, flight_date, status, order_open_at, order_close_at
FROM flight_windows
ORDER BY flight_date DESC
LIMIT 5;

-- If migration 016 not applied, apply it:
-- (run supabase/migrations/016_thursday_flight_windows.sql in SQL Editor)
```

## What NOT to do with this command

- Do NOT use to fix application bugs — those require code changes
- Do NOT use to apply schema migrations — use Supabase SQL Editor for those
- Do NOT run during a live order window — wait until order_close_at has passed
  to avoid corrupting in-flight reservations
