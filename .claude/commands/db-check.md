Run a DB Steward integrity audit against the live Supabase database.

## What this does

Invokes the `db-steward` agent to run all standard integrity checks.
Non-destructive — read-only queries only. Safe to run at any time.

## When to run

- At session start when last session's TODOs include migrations or schema changes
- After applying any migration via Supabase SQL Editor
- When app behaviour suggests a data issue (e.g. storefront shows wrong state,
  orders not confirming, duplicate flight windows appearing)
- Weekly as a routine health check before starting feature work

## Checks run

1. Schema drift — live columns vs src/types/database.ts
2. Duplicate flight_windows — flight_date should be unique
3. Stale status — stored status vs time-derived status for flight_windows
4. Stale order status — pending orders that should be confirmed
5. Orphaned order_items — pointing to deleted orders
6. Orphaned inventory — pointing to deleted flight_windows
7. RLS enabled — every customer-facing table has row-level security on
8. RLS policies — every RLS table has at least one policy
9. Null violations — NOT NULL columns checked for nulls from direct edits
10. Seed completeness — fish_species ≥ 7, villages ≥ 1, delivery_zones ≥ 5
11. Reserved-kg integrity — reserved_kg never exceeds total_capacity_kg
12. Flight window count — at least 1 upcoming/open window exists

## Output

Report in PASS / WARN / FAIL format, then summary counts.

Append the report to SESSIONS.md under the current session entry as:

```markdown
### DB Audit — YYYY-MM-DD
[paste report here]
```

## What to do with FAILs

Do NOT fix data issues here. Run `/db-fix` to review and approve each fix
individually with SELECT previews before any write is executed.
