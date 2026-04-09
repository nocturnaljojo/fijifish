# FijiFish — Session Log

Running log of what was built, decided, or unblocked each session. Claude reads this at session start (alongside `CLAUDE.md`) to pick up context.

Format: newest session on top. Each entry is a heading + short bullet list. Run `/wrap-up` at end of session to append.

---

## Known Issues

### #1 — WARN LOW: FJ391 Playwright text locator at 1280px
Playwright `page.locator('text=FJ391')` returns null at 1280px. Element uses `hidden sm:inline` — visually correct (confirmed screenshot). Likely test selector quirk with non-ASCII prefix. Fix: use `getByText('FJ391', { exact: false })` in future tests.

### #2 — WARN MEDIUM: Walu not in April fish grid
Walu season seeded as May–October (`month_start=5`). In April the grid shows Donu first. Sort logic is correct — Walu will appear first once in season. **Business decision needed:** should Walu start April or May? If April, run:
```sql
UPDATE seasons SET month_start = 4
WHERE fish_species_id = (SELECT id FROM fish_species WHERE name_fijian = 'Walu');
```

---

## Session 1 — 2026-04-09 — Phase 0 scaffold
- Abandoned the OneDrive-hosted prototype (Vite/React + stuck git worktree handle) and relocated to `C:\dev\fijifish\`.
- Scaffolded Next.js 16.2.3 via `create-next-app@latest` with TypeScript, Tailwind, ESLint, App Router, `src/` dir, `@/*` import alias, npm.
- Set up Claude Code project structure: `CLAUDE.md` + `FIJIFISH-WEBAPP-SPEC-v3.md` at root, 12 skills under `.claude/skills/`, empty `.claude/agents/` and `.claude/commands/` placeholders.
- Added `.env.example` listing Clerk, Supabase, Stripe, Twilio, Mapbox env vars (no real secrets committed).
- Fresh git repo on `main`, wired to `https://github.com/nocturnalJojo/fijifish.git`.
- Next.js version is 16.2.3 (latest) rather than 14 quoted in the spec — latest is fine, spec was written earlier.
- **Not yet set up:** Clerk, Supabase, Stripe, Twilio, Mapbox. Bare Next.js scaffold only.

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

### Next up (Phase 1b)
- [ ] Walu season decision (April vs May start) — see Known Issues #2
- [ ] Wire inventory_availability for real prices/capacity per flight window
- [ ] Admin panel: capacity + price management, flight window CRUD
- [ ] Clerk middleware + route protection
- [ ] Supabase RLS policies (Clerk JWT)
- [ ] Cart + Stripe checkout (AU buyers only)
- [ ] Realtime capacity subscriptions

### Next up (Phase 0 continuation — superseded by Session 2)
- [ ] Clerk integration (4 roles, middleware, webhook sync to Supabase `users` table)
- [ ] Supabase project in AU region + full v3 migration (see `FIJIFISH-WEBAPP-SPEC-v3.md` §11)
- [ ] Seed: Galoa village, 5–7 species + seasons, delivery zones, test flight window
- [ ] Vercel deploy
