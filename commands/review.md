---
description: Run a code review using Cursor Agent
argument-hint: '[--wait|--background] [--model <model>] [focus text]'
disable-model-invocation: true
allowed-tools: Read, Glob, Grep, Bash(node:*), Bash(git:*), AskUserQuestion
---

Run a Cursor Agent code review.

Raw slash-command arguments:
`$ARGUMENTS`

Core constraint:
- This command is review-only.
- Do not fix issues, apply patches, or suggest that you are about to make changes.
- Your only job is to run the review and return Cursor Agent's output verbatim.

Execution mode rules:
- If the raw arguments include `--wait`, run in the foreground.
- If the raw arguments include `--background`, run in a Claude background task.
- Otherwise, use `AskUserQuestion` exactly once:
  - `Wait for results (Recommended)`
  - `Run in background`

Foreground flow:
- Run:
```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/cursor-companion.mjs" review $ARGUMENTS
```
- Return the command stdout verbatim.

Background flow:
- Launch with `Bash` in the background:
```typescript
Bash({
  command: `node "${CLAUDE_PLUGIN_ROOT}/scripts/cursor-companion.mjs" review $ARGUMENTS`,
  description: "Cursor Agent review",
  run_in_background: true
})
```
- Tell the user: "Cursor Agent review started in the background. Check `/cursor:status` for progress."
