Run a hierarchical review of the current codebase state.

1. Read FIJIFISH-WEBAPP-SPEC-v3.md to understand what should exist
2. Read STATUS.md to understand what's marked as built
3. For each LIVE route in STATUS.md: verify the file actually exists (Glob)
4. For each LIVE component: check it compiles (no obvious TS errors from Read)
5. Check all API routes use `withErrorHandling` from api-helpers
6. Check no public page components use `createServerSupabaseClient()`
7. Check no hardcoded A$35 or price strings in components (Grep for 'A\$[0-9]')
8. Check SESSIONS.md is up to date (last entry date matches recent commits)
9. Compile findings into a prioritised report:
   - CRITICAL: things that would break for users right now
   - HIGH: security or data issues
   - MEDIUM: spec violations or tech debt
   - LOW: style/docs issues
10. If any CRITICAL issues found: fix them before proceeding to new features
