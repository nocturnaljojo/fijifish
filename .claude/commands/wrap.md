Wrap up the current session cleanly.

1. List everything built or changed this session
2. Update SESSIONS.md:
   - Add new session entry with date, what was built, known issues discovered
3. Update STATUS.md:
   - Update "Last updated" date
   - Mark any newly completed components/routes as LIVE
   - Add any new known issues
4. Ensure all files are saved and have no syntax errors
5. Run `npm run lint` — fix any errors in files touched this session
6. Run `/pre-commit` checklist
7. Commit all changes with message: "Session [X]: [summary of what was built]"
8. Push to main
9. Output a short summary: what's done, what's next, any blockers
