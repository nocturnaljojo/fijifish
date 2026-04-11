---
name: qa-playwright
description: QA the FijiFish app using Playwright browser automation. Use when asked to test, verify, review, or QA any feature. Opens the running app in a real browser, tests against FIJIFISH-WEBAPP-SPEC-v3.md requirements, and reports pass/fail with screenshots.
allowed-tools: Read, Write, Bash, Glob, Grep
context: fork
---

CRITICAL RULES:
1. NEVER delete or modify existing working code during QA. QA is read-only + test-only.
2. ALWAYS read FIJIFISH-WEBAPP-SPEC-v3.md before testing — the spec is the acceptance criteria.
3. ALWAYS run npm run dev first and wait for the server to be ready before testing.
4. ALWAYS take screenshots at each test step and save to tests/screenshots/
5. Report findings as: PASS (meets spec), WARN (works but doesn't match spec), FAIL (broken or missing).
6. If a test fails, describe what's wrong and what the spec says it should be — but do NOT fix it. File an issue in SESSIONS.md under "Known Issues" instead.

TEST CHECKLIST (run every QA session):
- Homepage loads on localhost:3000
- Dark WorldView theme applied (#0a0f1a background, not white, not default)
- IBM Plex Mono font used for all numbers, prices, countdown
- Plus Jakarta Sans font used for body text
- Navbar renders (fixed top, sign-in/sign-up links when logged out)
- Delivery banner visible at top with countdown timer and escalating cargo label
- Countdown timer ticks (check twice with 2 second gap)
- SocialProof bar renders with count-up stats (47 people, 8 zones, 3500km)
- Fish cards render from Supabase data (not empty state unless DB is empty)
- Each fish card shows: Fijian name, English name, price in sunset gold, capacity bar
- Walu is sorted first with "Most Popular" badge and hero styling
- UrgencyBanner: renders when cargo ≥ 80% or window < 12h; hidden otherwise
- Capacity bar: teal fill, amber when <20%, sold out shows red/badge
- ProcessSteps: 3-column grid on desktop, whileInView stagger animation
- DeliveryZoneBanner renders below ProcessSteps
- StickyOrderBar: hidden on desktop (md:hidden), appears after scroll on mobile
- Responsive: test at 375px (mobile), 768px (tablet), 1280px (desktop)
- No console errors in browser
- Clerk sign-in page loads at /sign-in
- Clerk sign-up page loads at /sign-up
- Footer renders with route chain and links
- Village preview section renders
- Galoa map animation renders (intersection observer trigger)
- Fish interest survey is accessible from homepage
- Delivery demand poll renders beside fish survey
- Feedback form is accessible
- /catch/[batchCode] route loads (stub page, not 404)

SEVERITY LEVELS:
- CRITICAL: Page doesn't load, white screen, console errors blocking render, wrong theme
- HIGH: Component missing that spec requires, wrong font, broken layout on mobile
- MEDIUM: Styling doesn't match spec, text doesn't match spec
- LOW: Minor polish

OUTPUT FORMAT:
Write a QA report to tests/qa-report-[date].md with:
- Date, environment, screenshot references
- Table: Feature | Spec Reference | Status | Severity | Notes
- Summary: X pass, X warn, X fail
- Recommended fixes prioritised by severity
