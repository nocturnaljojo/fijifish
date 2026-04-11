# FijiFish — Full Project Audit

**Date:** 2026-04-12
**Auditor:** Claude Sonnet 4.6
**Scope:** Structure, code quality, documentation, workflow, security, process

---

## 1. Project Structure Assessment

### Overview
- **70 TypeScript/TSX source files** across `src/`
- **27 live routes** (Vercel + localhost)
- **~6,500 estimated lines of code** in `src/`
- **14 skills**, 3 agents, 2 commands in `.claude/`
- **26 git commits** total across ~3 days of development

### Folder Organisation

✅ Clean and consistent:
```
src/app/           — route segments (App Router pattern)
src/app/admin/     — admin portal pages + co-located components
src/app/api/       — API routes
src/components/    — shared UI components
src/lib/           — business logic + utilities
src/types/         — shared TypeScript types
src/proxy.ts       — middleware (correct location per Next.js docs)
```

⚠️ Minor issues:
- `src/components/admin/AdminSidebar.tsx` is in a sub-folder but all other admin components (`WindowForm.tsx`, `PhotoQueue.tsx`, etc.) are co-located with their pages. Inconsistent — should either all be in `src/components/admin/` or all co-located.
- `src/app/checkout/CheckoutForm.tsx` is co-located with its page — fine, but inconsistent with admin pattern.

### Files Doing Too Much (over 300 lines)
| File | Lines | Assessment |
|------|-------|------------|
| `src/app/page.tsx` | 352 | ⚠️ OVER LIMIT — contains `getAllFish()`, two queries, fish grid logic, 8 sections |
| `src/components/FishCard.tsx` | 332 | ⚠️ AT LIMIT — HeroFishCard + FishCard in same file; they share no logic |
| `src/app/account/AccountContent.tsx` | 334 | ⚠️ AT LIMIT — `OrderCard`, `CopyButton`, `StatusBadge` + `AccountContent` all in one file |
| `src/app/api/checkout/route.ts` | 229 | OK — complex but single responsibility |
| `src/components/UnlockBoard.tsx` | 243 | OK |

### Orphaned / Dead Files
| File | Status |
|------|--------|
| `src/components/FishSurvey.tsx` | **DEAD** — Not imported anywhere. Replaced by UnlockBoard in Session C. |
| `src/components/FlightSchedule.tsx` | **QUESTIONABLE** — Only imported inside `GaloaMap.tsx`. GaloaMap is not on homepage (moved to `/supply-chain`). Effectively dead in the main flow. |

### Root-Level Junk
The project root contains 9 PDF files (`webUI.pdf` through `webUIv9.pdf`), 2 Word documents, and 2 HTML files — all from early design/prototype work. These are ignored by `.gitignore` but bloat the workspace and clutter file explorers. Not harmful, just noise.

---

## 2. Documentation Assessment

### CLAUDE.md
**Rating: 8/10 — Good but has stale references**

✅ Architecture patterns section is accurate and enforced  
✅ Red lines are clear and specific  
✅ Supabase client pattern explained well  
⚠️ Skills list says "14 skills" but only 14 exist — accurate, but the list in CLAUDE.md doesn't match the actual order in `.claude/skills/` (minor)  
⚠️ Reference to `AGENTS.md` doesn't exist in the list — AGENTS.md is present but not mentioned in CLAUDE.md as a reference file  
⚠️ `src/proxy.ts` is described as "role-based middleware" but CLAUDE.md also mentions `src/lib/roles.ts` and `src/lib/roles-client.ts` in the reference files section — not explained how they relate  
❌ **Missing:** No mention of `zustand` cart store pattern or when to use it  
❌ **Missing:** No mention of `MARKETING.md` even though it contains brand voice rules that affect copy in components  

### SESSIONS.md
**Rating: 9/10 — Excellent detail, well maintained**

✅ Every session has a clear list of changes  
✅ Known issues are tracked at the top  
✅ Pre-commit results recorded in each session  
✅ "Next up" tasks tracked across sessions  
⚠️ Known Issues #1 and #2 are missing (numbering starts at #3) — presumably resolved in early sessions but never removed from the list  
⚠️ Session numbering inconsistent: Sessions 1–6, then "Session A," "Session B" etc. — switched naming conventions mid-project  
⚠️ `TEST_INVENTORY` in `page.tsx` is documented in STATUS.md as a "remaining" issue but it's also a risk (outdated fallback data could mislead buyers if DB goes down)  

### STATUS.md
**Rating: 8/10 — Mostly accurate with some stale entries**

✅ Route table is current  
✅ API routes table is accurate  
✅ Lib files table is complete  
⚠️ Components table lists `GaloaMap.tsx` and `FishSurvey.tsx` and `ImpactFeed.tsx` as "active (rendered on homepage)" — they are NOT rendered on the homepage as of Session D  
⚠️ `orders` and `order_items` tables are marked "Not yet used" — they ARE used now via the checkout API  
⚠️ `migration 006 was skipped` note is present but never explained why  

### FIJIFISH-WEBAPP-SPEC-v3.md
**Rating: 6/10 — Increasingly divergent from reality**

The spec was written before most features were built. Key divergences found:
- Spec describes a `/fish` and `/fish/[id]` route — not built, not planned in STATUS.md
- Spec describes `/villages/[id]` — not built  
- Spec mentions `9-step shipment tracking` — tracking page is listed as NOT BUILT in STATUS.md  
- Spec describes Clerk → Supabase webhook sync on `user.created` — the webhook API route is NOT BUILT. The checkout API currently upserts users on-the-fly as a workaround.  
- Spec says `order status → paid` on payment; actual webhook sets status to `confirmed`. Status enum in DB has `paid` but code uses `confirmed` — mismatch.  
- The unlock/gamification mechanic (UnlockBoard) does NOT appear in the spec at all — it was added in Session C without a spec update  
- AU-only checkout gate: spec describes it clearly; code sets `country_code: "AU"` unconditionally in checkout API (line 107 of `route.ts`) — any logged-in user can checkout regardless of actual location. **The AU gate is not enforced.**

### Skills Assessment
| Skill | Last Updated | Accuracy |
|-------|-------------|---------|
| `worldview-ui` | Session 2 | ✅ Accurate |
| `clerk-auth` | Session 5 | ✅ Accurate |
| `order-window-logic` | Session 5 | ✅ Accurate |
| `pre-commit` | Session 6 | ✅ Accurate |
| `qa-playwright` | Session 5 | ⚠️ Checklist doesn't include cart, checkout, /account pages — stale |
| `stripe-checkout` | Session 1 (never updated) | ⚠️ Says status → `paid`; code uses `confirmed`. Says delivery fee as separate line item; not implemented |
| `seasonal-filter` | Session 1 (never updated) | ✅ Still accurate for seasonal query logic |
| `delivery-driver` | Session 1 (never updated) | ⚠️ Driver portal not built, skill untested |
| `notification-engine` | Session 1 (never updated) | ⚠️ Twilio not connected, skill untested |
| `flight-tracking` | Session 1 (never updated) | ⚠️ FlightRadar24 embed not built |
| `geo-pricing` | Session 1 (never updated) | ⚠️ AU gate logic exists in `pricing.ts` but checkout never calls `isAustralian()` |
| `supabase-migration` | Session 1 (never updated) | ✅ Schema conventions still match |
| `fiji-compliance` | Session 1 (never updated) | ⚠️ Not built yet — skill documents requirements not implementation |
| `photo-approval` | Session 5 | ✅ Accurate |

### AGENTS.md
**Rating: 3/10 — Present but not being used**

The file contains: `<!-- BEGIN:nextjs-agent-rules --> This is NOT the Next.js you know... <!-- END:nextjs-agent-rules -->` — This is a Next.js version warning injected by a tool, not actual agent configuration. The actual agent configs are in `.claude/agents/` (planner, reviewer, qa). AGENTS.md itself has no useful content.

The agents (`planner`, `reviewer`, `qa`) are defined and well-configured, but there is **no evidence in the git log or SESSIONS.md that `/review` or the `planner` agent was ever invoked before coding began.** Every session jumps straight to implementation. The review command exists but is not used.

### Missing Documentation
- No `CONTRIBUTING.md` or developer setup guide
- No `DEPLOYMENT.md` (how to set up env vars, Clerk session token, Vercel project)
- No API documentation (what each endpoint accepts/returns)
- MARKETING.md is excellent but not referenced from CLAUDE.md

---

## 3. Code Quality Assessment

### Type Checking & Lint
- **`npx tsc --noEmit`:** 0 errors ✅
- **`npm run lint`:** 0 errors ✅
- **`npm run build`:** Succeeds, 27 routes ✅

### API Routes — `withErrorHandling` Compliance
| Route | Uses withErrorHandling |
|-------|----------------------|
| `POST /api/checkout` | ✅ Yes |
| `POST /api/webhooks/stripe` | ❌ No — raw try/catch |
| `POST /api/survey/vote` | ❌ No — raw async function |
| `POST /api/feedback` | ❌ No — raw async function |
| `POST /api/delivery-demand/vote` | ❌ No — raw async function |
| `GET/POST/PATCH /api/admin/*` (4 routes) | ✅ Yes |

**4 of 9 API routes do NOT use `withErrorHandling`** — violates CLAUDE.md standard.

### Supabase Client Pattern Compliance
`createServerSupabaseClient()` is called in:
- `/api/survey/vote` — ⚠️ PUBLIC endpoint using service role key. Should use `createPublicSupabaseClient()` or anon key with RLS.
- `/api/feedback` — same issue
- `/api/delivery-demand/vote` — same issue
- `src/app/account/page.tsx` — acceptable (auth-gated)
- All admin pages — acceptable (auth-gated)

The original empty fish grid bug (SESSIONS.md, Session 3) was caused by exactly this pattern. Three API routes still use service role for public/semi-public operations.

### Hardcoded Values Remaining in Components
The following hardcoded `A$35/kg` strings exist **in components** despite `config.ts` being the stated source of truth:
- `src/components/HeroSection.tsx` (2 occurrences)
- `src/components/ProcessSteps.tsx`
- `src/components/StickyOrderBar.tsx`
- `src/app/impact/page.tsx`
- `src/app/supply-chain/page.tsx`

These should reference a value from `config.ts`. If pricing changes, 6 files need manual updates.

### Security Issues

**🚨 CRITICAL — `.env.txt` contains live API keys in the project root**

The file `.env.txt` was found to contain:
- `CLERK_SECRET_KEY` (live, prefixed `sk_test_`)
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `SUPABASE_URL`
- `SUPABASE_ANON_PUBLIC` key
- `SUPABASE_SERVICE_ROLE_SECRET` (the most sensitive key — bypasses all RLS)
- `MAPBOX_API_TOKEN`

`.env.txt` is listed in `.gitignore` so it is NOT committed to git. However:
1. It's a plaintext file sitting next to the source code with a non-standard name
2. Office temp file `~$ogleAIstudiowebUI.docx` is also in the project root — Office temp files can snapshot nearby content
3. If `.gitignore` were accidentally removed or `.env.txt` renamed to `.env`, keys would be committed

**Recommendation: Move these values into `.env.local` (the standard Next.js secret file) and delete `.env.txt`.**

**⚠️ HIGH — AU-only purchase gate is not enforced**

`src/lib/pricing.ts` has `isAustralian()` but it is never called in the checkout flow. The checkout API (`/api/checkout/route.ts:107`) unconditionally sets `country_code: "AU"` when upserting the user record. Any authenticated user — regardless of their actual location — can place an order and reach Stripe checkout. This violates a core spec requirement and CLAUDE.md red line: `NEVER allow non-AU users to reach Stripe checkout`.

**⚠️ HIGH — No Clerk webhook → Supabase user sync**

`/api/webhooks/clerk` is NOT BUILT. Currently, users are only added to the Supabase `users` table when they place an order (via the checkout API). This means:
- Users who sign up but don't order don't exist in Supabase
- `/account` page will show empty state for users who have voted but never ordered (their clerk_id exists in `fish_interest_votes` but not `users`)
- The `fish_interest_votes` query in `/account/page.tsx` will work, but the `dbUser` check will fail and return early before showing votes

**⚠️ MEDIUM — Reorder button has incorrect `maxAvailableKg`**

`AccountContent.tsx` Reorder uses `maxAvailableKg: qty + 9` as an arbitrary cap. The current available kg from inventory is not fetched when rendering the account page — the reorder could let a user add more kg to cart than is actually available, only failing at checkout.

**⚠️ MEDIUM — `delivery_address` column mismatch**

The checkout API inserts `delivery_address` and `delivery_notes` into the `orders` table, but the migration `001_initial_schema.sql` does NOT have these columns on `orders`. They exist on `customers`. The insert either silently fails or the Supabase client ignores unknown columns. Order delivery address may not be stored.

### Type Consistency
- `FishRow`, `VillageRow`, `SurveyRow` in `page.tsx` are defined inline instead of in `src/types/database.ts` — violates the architecture pattern
- `RawOrderItem` and `RawOrder` types in `account/page.tsx` are local — acceptable given they're transformation types
- `AccountOrderItem`, `AccountOrder`, `VotedFish` are exported from `AccountContent.tsx` instead of `database.ts` — should be in `database.ts`

---

## 4. Workflow Assessment

### Git Commit Quality
26 total commits. Pattern analysis:
- **Feature commits:** 18
- **Fix commits:** 8 (31% of all commits are fixes)
- **Doc commits:** 2
- **Chore commits:** 1

The 31% fix rate is high for a new project but understandable given rapid iteration. Notable fix patterns:
- Fish grid was broken and fixed twice (Sessions 3 and 6) — once by root cause (wrong Supabase client), once by additional fixes
- Clerk dark theme was fixed as a standalone commit (should have been part of the auth session)
- `package-lock.json` missing from commit required its own fix commit — avoidable if `git status` was checked before pushing

### Session Logging
✅ Consistent and detailed — every session has a clear record  
✅ Build results recorded (`lint 0 · tsc 0 · build ✓`)  
✅ Known issues tracked  
⚠️ The mandatory workflow says `ALWAYS read FIJIFISH-WEBAPP-SPEC-v3.md before writing code` — no evidence in sessions that the spec was consulted for Sessions C, D, or E. The unlock mechanic (Session C) was built without a spec entry, and the spec was not updated to include it.

### Pre-commit Skill Compliance
The pre-commit skill defines 7 checks. Evidence from sessions:
- ✅ Type check: reported as 0 errors in every session
- ✅ Lint: reported as 0 errors in every session
- ✅ Build: reported as success in every session
- ✅ SESSIONS.md: updated in every session
- ✅ STATUS.md: updated in most sessions
- ❌ `withErrorHandling` on all routes: 4 routes still don't comply
- ❌ No hardcoded values: 6 instances of `A$35/kg` remain in components
- ❌ FIJIFISH-WEBAPP-SPEC-v3.md: not updated after Sessions C, D, or E despite new features

### Bug Recurrence
The empty fish grid bug occurred and was "fixed" before Session 3 (cb53296), then required a dedicated session (Session 3/87d6fe6) to properly fix. The root cause was well documented. No recurrence since, and the fix is well-explained in CLAUDE.md — good regression prevention.

---

## 5. Skills & Agents Assessment

### Skills — Usage Evidence
| Skill | Used By | Evidence |
|-------|---------|----------|
| `worldview-ui` | All sessions | Sessions mention dark theme compliance; referenced in system prompts |
| `pre-commit` | Sessions D, E | Build/lint/tsc checks present in session notes |
| `stripe-checkout` | Session D | Referenced when building checkout |
| `seasonal-filter` | Sessions 2, C | Query patterns followed |
| `clerk-auth` | Sessions 3, A, B | Role middleware, getUserRole used correctly |
| `qa-playwright` | Session 2 | One QA run (April 9). Not run since. |
| `order-window-logic` | Session B | Flight window state machine referenced |
| `photo-approval` | Session B | Photo queue built |
| `supabase-migration` | Sessions 0–A | Schema conventions followed |
| `geo-pricing` | Never | `isAustralian()` exists but AU gate not wired in checkout |
| `delivery-driver` | Never | Portal not built yet |
| `notification-engine` | Never | Twilio not connected |
| `flight-tracking` | Never | FlightRadar24 not built |
| `fiji-compliance` | Never | Not yet required |

### Agents — Usage Evidence
The agents (planner, reviewer, qa) are defined but there is **no evidence in SESSIONS.md that any agent was explicitly invoked** (`/review`, `/qa`, or `/plan`). The agents exist as configurations only. This is the largest workflow gap in the project — features are being built without a planning step and without post-implementation review.

### Commands
Two commands: `/qa` and `/review`. Neither appears in SESSIONS.md as having been run. The `/qa` command was run once in Session 2 (manually, not as a slash command) but has not been run since. The checkout flow, account page, and gamification have never been QA tested.

---

## 6. Architecture Assessment

### Server vs Client Component Separation
✅ Generally clean — data fetching in server components, interactivity in client components  
✅ `page.tsx` files are server components with correct patterns  
✅ Cart (zustand), forms, and interactive elements are client components  
⚠️ `src/app/order/success/page.tsx` is a client component (`"use client"`) — it was forced to be because it has an `onClick` on the share button. But `metadata` export was removed when adding `"use client"`. Pages with metadata should be server components. The share button could be extracted into a tiny `<ShareButton />` client component to keep the page as a server component.

### Data Fetching Patterns
✅ `page.tsx` fetches all data and passes via props — pattern followed  
✅ Public pages use `createPublicSupabaseClient()`  
⚠️ Three API routes (`/api/survey/vote`, `/api/feedback`, `/api/delivery-demand/vote`) use `createServerSupabaseClient()` — they should use anon key since they handle semi-public data and don't require RLS bypass  
⚠️ `page.tsx` has a `TEST_INVENTORY` fallback that would serve stale mock data if the DB query fails — risky for a live commerce app

### Performance Anti-patterns
- `export const dynamic = "force-dynamic"; export const revalidate = 0;` on the homepage — necessary for live inventory data but means every page view hits the database. Should consider Supabase Realtime + client-side updates or ISR with short revalidation instead.
- Multiple sequential Supabase queries in `account/page.tsx` (user → customer → orders → votes) — could be parallelised with `Promise.all()`

### Middleware / Route Protection
⚠️ `src/proxy.ts` protects `/admin/*`, `/supplier/*`, `/driver/*` based on Clerk role metadata. But **Known Issue #3** (Clerk session token not customised) means all users are currently treated as "buyer." Admin, supplier, and driver routes are accessible to anyone who is signed in. This is a critical gap for production.

### Circular Imports
No circular imports detected.

---

## 7. What's Working Well

1. **Three-client Supabase pattern** — clearly documented, consistently followed on public pages after Session 3 fix. The root cause analysis was thorough and the solution elegant.

2. **`src/lib/config.ts` as single source of truth** — centralized constants, no magic numbers in business logic. Components accept optional DB props with config fallbacks.

3. **`withErrorHandling` + `requireAdmin()` pattern** — all admin API routes follow this consistently. Clean and readable.

4. **Pre-commit discipline** — tsc/lint/build checks are run and reported in every session. Zero TypeScript errors throughout the project.

5. **SESSIONS.md discipline** — every session is documented in detail. Future developers (and future Claude sessions) can reconstruct the full project history from SESSIONS.md alone.

6. **Dark theme consistency** — WorldView HUD design system is applied uniformly. No light backgrounds or default Tailwind blue. The CSS variable system is clean.

7. **Framer-motion animation patterns** — `whileInView` + `viewport: { once: true }` stagger pattern is used consistently across cards. Feels premium without being heavy.

8. **Nullability-safe cart operations** — zustand cart with `partialize` for selective persistence, hydration guard pattern (`mounted` state) consistently applied across all cart-using components.

9. **Agents and skills architecture** — the skill system is well-structured. Having 14 domain-specific skills prevents Claude from hallucinating domain knowledge. The agent definitions are concise and specific.

10. **MARKETING.md** — having the brand voice, objection handling, and unit economics in a single document is excellent. Ensures UI copy stays on-brand.

---

## 8. What Needs Improvement

### CRITICAL

**C1 — `.env.txt` contains live API keys**
A plaintext file in the project root contains Clerk secret key, Supabase service role key, and Mapbox token. While gitignored, this is a security risk. Delete `.env.txt`; use only `.env.local`.

**C2 — AU-only checkout gate is not enforced**
`isAustralian()` exists in `pricing.ts` but is never called in the checkout flow. Any user can reach Stripe checkout. Red line violation. Effort: Low (1 API call before creating Stripe session).

**C3 — Clerk session token not customised (Known Issue #3)**
All users are treated as buyers. Admin panel, supplier portal, driver portal — route protection is bypassed. This has been known since Session 3 and is still unresolved. Not a code issue — requires Clerk Dashboard action. Effort: 2 minutes (Clerk Dashboard config).

### HIGH

**H1 — 4 API routes don't use `withErrorHandling`**
`/api/survey/vote`, `/api/feedback`, `/api/delivery-demand/vote`, `/api/webhooks/stripe` all use raw async functions. Unhandled promise rejections will return 500 with no logging. Effort: Low (wrap existing handlers).

**H2 — `delivery_address` missing from `orders` table**
The checkout API inserts `delivery_address` into `orders` but this column doesn't exist in `001_initial_schema.sql`. Order delivery addresses may be silently lost. Fix: add migration to add the column, or move delivery address storage to `customers` table consistently. Effort: Medium (migration + test).

**H3 — No Clerk webhook — users not synced**
New users who sign up but don't order don't exist in Supabase. `/account` page shows incorrect empty state for these users. The checkout API workaround is fragile. Effort: Medium (build `/api/webhooks/clerk`).

**H4 — `FishSurvey.tsx` is a dead file**
`src/components/FishSurvey.tsx` is not imported anywhere (replaced by UnlockBoard). Keeping dead files increases maintenance surface. Effort: Trivial (delete, verify build passes).

**H5 — FIJIFISH-WEBAPP-SPEC-v3.md not updated**
The spec is the declared source of truth but is ~6 sessions behind. The unlock mechanic, cart flow, account page, and checkout are not in the spec. When a new developer (or Claude in a new session) reads the spec, they get an incomplete picture. Effort: Medium (1–2 hours to update).

**H6 — `createServerSupabaseClient()` in public API routes**
`/api/survey/vote`, `/api/feedback`, `/api/delivery-demand/vote` use the service role key. These routes handle anonymous/semi-public actions and don't need RLS bypass. If `SUPABASE_SERVICE_ROLE_KEY` is not set in Vercel, these routes will throw 500. Effort: Low (swap to `createPublicSupabaseClient()`).

### MEDIUM

**M1 — `A$35/kg` hardcoded in 6 component files**
Price appears in HeroSection, ProcessSteps, StickyOrderBar, and two stub pages. Should be `FLIGHT_CONFIG.priceDisplay` in `config.ts`. Effort: Low.

**M2 — `page.tsx` is 352 lines with inline types**
`FishRow`, `VillageRow`, `SurveyRow` types are defined inline. `getAllFish()` function is embedded. Should extract types to `database.ts` and query functions to `flight-windows.ts` or a new `fish-queries.ts`. Effort: Medium.

**M3 — QA has not been run since Session 2**
The checkout flow, account page, gamification (UnlockBoard), and CartDrawer have never been tested via Playwright. The QA report is from April 9 — 3 days and ~15 features ago. Effort: Low (run `/qa`).

**M4 — `order/success/page.tsx` missing metadata**
Adding `"use client"` removed the `metadata` export. Pages should have metadata for SEO. The share button should be a small client component instead. Effort: Low.

**M5 — Reorder button `maxAvailableKg` is incorrect**
Uses `qty + 9` as an arbitrary cap instead of querying current inventory. Effort: Medium (would require client-side inventory fetch or additional server-side data in account page).

**M6 — `account/page.tsx` has sequential DB queries**
Five sequential Supabase queries. Could use `Promise.all()` for the independent ones (votes query is independent of customer/orders chain). Effort: Low.

**M7 — STATUS.md components section is stale**
Lists `GaloaMap`, `FishSurvey`, `ImpactFeed` as "active on homepage" — they were moved off the homepage in Session D. Effort: Trivial.

**M8 — `qa-playwright` skill checklist is outdated**
Doesn't include: CartDrawer, /checkout flow, /account, /supply-chain, /impact. Effort: Low.

**M9 — `stripe-checkout` skill says status → `paid`; code sets `confirmed`**
Inconsistency between skill documentation and actual implementation. Effort: Trivial (update skill).

### LOW

**L1 — Root-level junk files**
9 PDFs, 2 Word docs, 2 HTML files in project root. Not committed to git but clutter workspace. Delete or move to a `/docs` folder.

**L2 — Session numbering inconsistency**
Sessions 1–6 then A–E. Minor — doesn't affect functionality.

**L3 — `migration 006 was skipped` — undocumented reason**
Should add a comment explaining why 006 was skipped (e.g., merged into 007, or abandoned).

**L4 — `.playwright-mcp/` logs in project root**
17 Playwright session log files committed to the project. These are tool artifacts. Should be gitignored.

**L5 — `tsconfig.tsbuildinfo` should be gitignored**
Build artifact that shouldn't be tracked.

**L6 — AGENTS.md contains only a Next.js version warning**
The file is meaningless as it stands. Should contain actual agent guidance or be deleted.

---

## 9. Recommendations

### Process Improvements

**1. Make `/review` mandatory before every commit**
Currently, `/review` is never run. The agent is well-configured (opus model, staff engineer persona) — it's just not being used. Add to CLAUDE.md: "ALWAYS run `/review` before committing new features."

**2. Make `/qa` mandatory after every feature session**
QA hasn't run in 3 days and 15 features. The checkout flow has never been tested in a real browser. Run `/qa` at the end of every session that adds user-facing features.

**3. Use the planner agent for every feature over 50 lines**
The planner agent produces acceptance criteria, identifies regression risks, and scopes what's NOT being built. This prevents scope creep and the 31% fix rate. Add to session start checklist: "For any new feature: `/plan [feature name]` before writing code."

**4. Add a session-start checklist to CLAUDE.md**
Current checklist is: read docs → state phase/issues/next task → load skills. Add:
- Check if `.env.txt` or similar sensitive files exist in the root
- Run `git status` to check for uncommitted changes
- Run `npm run build` to confirm baseline is clean before starting

**5. One feature per session, not 3**
Sessions C and D each had 3 priority items. This leads to context compression, incomplete pre-commit checks, and harder-to-review diffs. Break each session into one well-defined feature.

---

### Prompt Effectiveness Guide

**What makes a good prompt:**
- States the WHAT and WHY, not the HOW
- References the spec: "per section 4 of the spec, the capacity bar should..."
- States explicit constraints: "do not modify page.tsx"
- States acceptance criteria: "this works when a buyer in Wagga can add Walu to cart and reach Stripe"
- Identifies what's already built: "the checkout API exists at /api/checkout — use that"

**What makes a bad prompt:**
- Specifying exact file names and function names (Claude may invent APIs that match the name)
- Pasting code snippets and asking Claude to extend them (Claude may rewrite everything)
- Asking for 10 things at once (Sessions C and D — leads to incomplete work)
- Not stating which files should NOT be touched
- Instructing Claude to run SQL directly without verifying the schema first

**The package-lock.json incident:** In Session D, `stripe` and `zustand` were installed locally and added to `package.json` but `package-lock.json` was never committed, causing a Vercel build failure. This happened because the session focused on feature implementation without a final `git status` check. A post-commit checklist would have caught this.

---

### Anti-Hallucination Rules for CLAUDE.md

Add this section to CLAUDE.md:

```markdown
## Anti-hallucination rules — READ BEFORE WRITING CODE
- NEVER import from a file that you haven't verified exists with Glob or Read
- NEVER assume a package is installed — check package.json first
- NEVER write a Supabase query using a column you haven't verified in the migration files
- NEVER create a new DB table without running a migration — check mcp__supabase__execute_sql
- NEVER call a function from src/lib/ without reading that file first
- NEVER add a dependency without running `npm install [package]` and confirming it in package.json
- When fixing a build error, read the full error message before changing code
- When a type error points to a missing column, CHECK THE MIGRATION — don't add the column to the TypeScript type without verifying it exists in SQL
```

---

### Agent/Skill Optimisation

**Add these skills:**
1. `/wrap-up` — session-end checklist: update SESSIONS.md, update STATUS.md, update spec if changed, run pre-commit, commit, push. Currently referenced in CLAUDE.md but the file doesn't exist.
2. `/plan [feature]` — create a slash command that invokes the planner agent. Currently the planner agent exists but there's no `/plan` command.
3. `/db-check` — verify a table/column exists before writing a Supabase query. Would prevent the `delivery_address` column bug.

**Update these skills:**
1. `stripe-checkout` — update status terminology (`confirmed` not `paid`), add delivery_address bug note
2. `qa-playwright` — add cart, checkout, account, supply-chain, impact to test checklist
3. `geo-pricing` — add that `isAustralian()` must be called in `/api/checkout` before creating Stripe session

**Remove/consolidate:**
- No skills should be deleted — even unused skills (notification-engine, flight-tracking) document future requirements

---

### Quality Gates

**Before every commit (automated if possible):**
```bash
npx tsc --noEmit      # 0 errors
npm run lint          # 0 errors
npm run build         # must succeed
git status            # check nothing sensitive is staged
```

**Before every push:**
- Run `/review` agent on changed files
- Verify SESSIONS.md and STATUS.md are updated
- Verify spec is updated if features changed

**At session start:**
1. `git pull` — confirm on latest main
2. `npm run build` — confirm baseline is clean
3. Read SESSIONS.md last 2 sessions — understand current state
4. For any new feature: run `/plan [feature name]` before writing code

**At session end:**
1. Run `/qa` if user-facing features were added
2. Commit with descriptive message
3. Push
4. Verify Vercel build passes in the dashboard

---

## 10. Effective Prompting Guide for Jovi

### The Core Principle
Claude Code is most effective when you describe the **outcome** you want, not the **implementation steps**. The more you specify HOW to build something, the more you constrain Claude into your mental model rather than the best technical solution.

---

### DO THIS

**Start with context, not code:**
> "I need a way for buyers to see their past orders. They should be able to reorder in one click. Dark theme, mobile-first, consistent with the rest of the app."

**Reference the spec:**
> "Per section 6 of the spec, supplier accounts should only see their own village's orders. Build the supplier portal with this constraint enforced at the query level."

**State acceptance criteria — what does success look like:**
> "This is done when: a signed-in buyer at /account can see their order from last week, click Reorder, and have it in their cart."

**Specify constraints — what should NOT change:**
> "Build the delivery tracking page. Do not modify page.tsx, do not change the existing order schema."

**State the phase and what's already built:**
> "Phase 2: Supplier portal. The admin API routes at /api/admin/ show the pattern. The Supabase schema has village_id on both users and orders. Build matching supplier endpoints."

**One feature per session:**
> Session A: "Cart store with localStorage persistence. Nothing else."
> Session B: "CartDrawer UI. Wire it to the cart store. Nothing else."
> Session C: "Checkout page and /api/checkout. Wire it to the cart."

---

### DON'T DO THIS

**Don't specify file names or function names:**
❌ "Create `src/components/CartDrawer.tsx` with a `useCartState` hook and a `CartItem` interface and an `AnimatePresence` wrapper..."
✅ "I need a cart drawer. It slides in from the right. Shows items with quantities. Has a checkout button."

**Don't paste implementation instructions disguised as requirements:**
❌ "Use `useState` for the open/close state, `localStorage` for persistence, and `framer-motion` for the animation. The component should export `useCart` and `CartDrawer`."
✅ "The cart should persist when the page refreshes. Use whatever state management makes sense."

**Don't write 200-line prompts:**
❌ [The Session D prompt from this project — 3 priorities, 15 bullet points, 5 specific file names, exact behavior of each button]
✅ Separate sessions: "Session 1: page length reduction. Session 2: premium image placeholders. Session 3: cart and checkout."

**Don't ask for SQL without checking the schema first:**
❌ "Run UPDATE orders SET delivery_address = ... WHERE ..."
✅ "Store the delivery address with the order. Check if orders has a delivery_address column or if it needs a migration."

**Don't skip the planning step for complex features:**
❌ [Building checkout, webhooks, and success page in one session without planning]
✅ "Before building the Stripe checkout flow, run `/plan stripe-checkout` and review the plan with me."

---

### Example Prompts: Bad vs Good

**BAD (cart from Session D):**
> "zustand cart store with localStorage persistence — CartItem { fishSpeciesId, quantityKg, maxAvailableKg } — CartStore with openCart/closeCart/addItem/updateQuantity/removeItem/clearCart/totalCents/totalKg/itemCount — persists only items via partialize"

**GOOD:**
> "I need a cart. Buyers add fish in whole kg increments. Cart should survive page refreshes. Maximum quantity per item is the available kg for that species. Build just the cart store for now — no UI."

---

**BAD (Supabase schema):**
> "Run ALTER TABLE orders ADD COLUMN delivery_address TEXT"

**GOOD:**
> "The checkout needs to store the delivery address with the order. Check if the orders table already has this column. If not, create a migration to add it."

---

**BAD (fixing a bug):**
> "Add `export const dynamic = 'force-dynamic'` to page.tsx line 3"

**GOOD:**
> "The fish grid is empty in production. The data exists in Supabase. Find the root cause — don't just add cache-busting flags without understanding why it's failing."

---

**BAD (new feature):**
> "Create src/app/supplier/page.tsx with a list of orders for the current supplier's village"

**GOOD:**
> "Phase 2: Build the supplier homepage. A supplier signs in and should see only orders from their village, with status and contact details. They can't see other villages' data. The village_id is in their Clerk public metadata."

---

### Session Start Template

Copy this into every new session:

```
Read CLAUDE.md, SESSIONS.md, STATUS.md.

Current phase: [Phase 1b / 2 / 3]
Last built: [what was done in the last session]
Known blockers: [any known issues that affect this session]

Today's task: [ONE FEATURE OR CLEAR SCOPE]
Acceptance criteria: [what does success look like?]
Constraints: [what should not change?]
```

---

*End of audit. No code changes were made in this report.*
