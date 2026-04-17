# FijiFish — Agent System

Four specialised agents covering the full development lifecycle.
Each operates in a different layer: code intent, code quality, running app, and live data.

---

## The 4 agents

| Agent | Model | Layer | Invoked via |
|-------|-------|-------|-------------|
| **Planner** | Opus | Pre-feature planning | `/plan` |
| **Reviewer** | Opus | Pre-commit code review | `/review` |
| **QA** | Sonnet | Running app (browser) | `/qa` |
| **DB Steward** | Sonnet | Live database (Supabase MCP) | `/db-check`, `/db-fix` |

---

## Planner (`planner.md`)

**When:** Before writing any new feature. Before touching existing code for a medium/large change.

**Does:**
- Reads spec + STATUS.md + relevant files
- Produces acceptance criteria, file list, migration needs, edge cases
- Flags regression risks and scope boundaries
- Challenges assumptions — "what happens when X fails?"

**Does not:** Write code, modify files, access live database.

**Tools:** Read, Glob, Grep

---

## Reviewer (`reviewer.md`)

**When:** After implementation, before committing. After the pre-commit checklist passes.

**Does:**
- Security review (auth, secrets, service key usage)
- Error handling completeness
- TypeScript strictness
- Business logic correctness (prices in cents, capacity math)
- Spec compliance check
- Regression risk assessment

**Does not:** Fix code, access database, run the app.

**Tools:** Read, Glob, Grep, Bash

---

## QA (`qa.md`)

**When:** After user-facing changes are deployed to localhost. Before marking a feature complete.

**Does:**
- Opens the running app in a real browser via Playwright
- Walks through the spec checklist for changed features
- Takes screenshots, saves to `tests/screenshots/`
- Files bugs to SESSIONS.md under "Known Issues"

**Does not:** Modify source code, fix bugs, access database.

**Tools:** Read, Write, Bash, Glob, Grep (+ Playwright MCP)

---

## DB Steward (`db-steward.md`)

**When:**
- Session start — if last session's TODOs include migrations or schema changes
- After applying any migration via Supabase SQL Editor
- When app behaviour suggests a data issue (wrong window state, duplicate rows, missing fish)
- Weekly health check before starting feature work

**Does:**
- Schema drift detection (live columns vs `src/types/database.ts`)
- Duplicate row detection (`flight_windows.flight_date` uniqueness)
- Stale status detection (`flight_windows` stored status vs time-derived)
- Orphaned FK detection (`order_items`, `inventory_availability`)
- RLS coverage check (every table has RLS enabled + at least one policy)
- Seed data completeness (fish_species, villages, delivery_zones row counts)
- Reserved-kg integrity (`reserved_kg` ≤ `total_capacity_kg`)
- Flight window count (at least 1 upcoming/open window — storefront liveness)

**Does not:** Modify code, write to database without explicit approval per operation.

**Tools:** Supabase MCP (execute_sql, list_tables), Read, Glob, Grep

---

## Decision tree — which agent to invoke?

```
About to write a new feature or touch >3 files?
  → /plan (Planner)

Just finished implementation, about to commit?
  → /review (Reviewer)

Just deployed a user-facing change and want to verify it works?
  → /qa (QA)

Starting a session where last TODOs include migrations?
  → /db-check (DB Steward)

App behaviour looks wrong (wrong state, missing data, duplicate rows)?
  → /db-check (DB Steward)

/db-check returned FAILs?
  → /db-fix (DB Steward — fix mode)

Something feels broadly off and you want an independent audit?
  → /review (full codebase audit mode)
```

---

## What each agent cannot do

| Agent | Cannot do |
|-------|-----------|
| Planner | Write code, access live DB, modify files |
| Reviewer | Fix code, access live DB, run the app |
| QA | Fix code, modify source files, access DB |
| DB Steward | Modify application code or docs; write to DB without explicit per-operation approval |

---

## Agent gap coverage

| Risk | Covered by |
|------|-----------|
| Wrong approach before coding | Planner |
| Security bug in new code | Reviewer |
| Feature broken in browser | QA |
| Schema drift between code and live DB | DB Steward |
| Duplicate/stale DB rows | DB Steward |
| RLS not applied after migration | DB Steward |
| Missing seed data | DB Steward |
| Storefront dead-end (no open windows) | DB Steward |
