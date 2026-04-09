Run a hierarchical review of the current codebase state.
1. Use planner agent to verify implementation matches spec
2. Use reviewer agent to review uncommitted changes or last commit
3. Use qa agent to test running app with Playwright
4. Compile findings into single report, prioritised by severity
5. If any CRITICAL issues, do NOT proceed to next feature
