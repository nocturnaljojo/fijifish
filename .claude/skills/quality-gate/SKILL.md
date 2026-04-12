---
name: quality-gate
description: Full quality check — TypeScript types, lint, build, and security audit. Run before any commit to main or before starting a new feature. Returns pass/fail with specific errors to fix.
allowed-tools: Read, Grep, Bash
---

# Quality Gate

Run all checks in order. Stop and report if any check fails hard (errors, not warnings).

## Step 1 — TypeScript
```bash
npm run typecheck
```
- Zero errors required
- Warnings acceptable but note them

## Step 2 — Lint
```bash
npm run lint
```
- Zero errors required
- Warnings: fix any in files you've touched this session

## Step 3 — Build
```bash
npm run build
```
- Must complete without errors
- Note any warnings about missing env vars (expected in dev)

## Step 4 — Security grep checks
Run these Grep checks manually:

1. No hardcoded prices: `A\$[0-9]` in `src/` (excluding config.ts)
2. No service client on public pages: `createServerSupabaseClient` outside `api/admin`, `api/webhooks`, and auth-gated pages
3. No `any` type explosions: count `any` in `src/types/` (should be 0)
4. No bare async handlers: `export async function (POST|GET)` not preceded by `withErrorHandling`

## Step 5 — Report

Output:
```
Quality Gate: [PASS / FAIL]

TypeScript: [PASS / X errors]
Lint: [PASS / X errors]  
Build: [PASS / FAIL]
Security checks: [PASS / issues found]

[If FAIL: list specific errors with file:line]
```

## Common failures and fixes

**TS error: Property X does not exist on type Y**
→ Check `src/types/database.ts` — column name may be wrong

**Lint: react-hooks/rules-of-hooks**
→ Move all hooks before any conditional returns in the component

**Build: Module not found**
→ Check the import path — file may not exist (use Glob to verify)

**Build: Event handlers cannot be passed to Client Component props**
→ Add `"use client"` to the component receiving the handler
