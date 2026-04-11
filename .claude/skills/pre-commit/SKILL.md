---
name: pre-commit
description: Run before every commit. Catches regressions, type errors, lint issues, and ensures docs are updated. ALWAYS run this before committing.
allowed-tools: Read, Bash, Grep, Glob
---

# Pre-Commit Checklist

Run these checks in order. Fix every failure before committing.

## 1. Type check (zero errors allowed)
```bash
npx tsc --noEmit
```

## 2. Lint (zero errors allowed)
```bash
npm run lint
```

## 3. Build check (must succeed)
```bash
npm run build
```

## 4. Documentation checks
- [ ] Did you update `SESSIONS.md` with what was built?
- [ ] Did you update `STATUS.md` if routes, components, or tables changed?
- [ ] Did you update `FIJIFISH-WEBAPP-SPEC-v3.md` if any features changed?

## 5. Code hygiene checks
- [ ] No hardcoded values in components — use `src/lib/config.ts`
- [ ] No `console.log` statements left (use `console.error` for real errors)
- [ ] No `@ts-ignore` or `// eslint-disable` without a comment explaining why

## 6. Pattern compliance
- [ ] All new API routes use `withErrorHandling` from `src/lib/api-helpers.ts`
- [ ] All new components have TypeScript prop interfaces (not inline types)
- [ ] All new DB types are in `src/types/database.ts` (not inline)
- [ ] Public page data queries use `createPublicSupabaseClient()` (not service role)
- [ ] Admin API routes call `requireAdmin()` before any Supabase writes

## 7. Regression check
- [ ] Does the homepage fish grid still render? (run dev server, check localhost:3000)
- [ ] Could this change break: Navbar, DeliveryBanner, FishCard, GaloaMap, FishSurvey?
- [ ] If you changed any component props, did you update all parents that pass those props?
- [ ] If you changed a Supabase table or query, did you check all code that references it?

## Common failures and fixes
| Error | Fix |
|-------|-----|
| `Type 'any' is not allowed` | Add a proper type to `src/types/database.ts` |
| `no-html-link-for-pages` | Use `<Link>` from next/link instead of `<a href>` |
| `Unexpected console statement` | Use `console.error()` or remove it |
| `no-unused-vars` | Remove the import/variable |
| Hydration mismatch | Use `useEffect` + null initial state pattern |
