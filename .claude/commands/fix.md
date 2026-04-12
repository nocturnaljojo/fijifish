Fix a specific bug described in $ARGUMENTS.

1. Read the error message or bug description carefully
2. Grep for the relevant code before assuming anything
3. Read all files involved — do NOT edit what you haven't read
4. Identify root cause (not just symptoms)
5. Before fixing: ask "what else uses this code?" — check for regressions
6. Apply the minimal fix — do not refactor surrounding code
7. Verify the fix resolves the original issue
8. Run `npm run lint` on changed files
9. Commit with message: "fix: [short description of what was broken and why]"
