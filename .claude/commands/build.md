Build a feature from spec. Run this after /plan has been approved.

1. Load relevant skills for the feature
2. Implement in this order: migrations → types → lib → API routes → server components → client components
3. After each file: verify no TypeScript errors in that file
4. After all files: run `npm run typecheck` and fix any errors
5. Run `npm run lint` and fix any warnings in changed files
6. Run `/pre-commit` checklist
7. Update SESSIONS.md with what was built
8. Update STATUS.md if new routes/components/tables were added
9. Commit with descriptive message
10. Push to main
