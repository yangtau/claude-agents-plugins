---
description: Delegate a coding task to Cursor Agent
argument-hint: '[--wait|--background] [--write] [--model <model>] [--mode plan|ask] <prompt>'
disable-model-invocation: true
allowed-tools: Read, Glob, Grep, Bash(node:*), Bash(git:*), AskUserQuestion
---

Run a Cursor Agent task through the companion runtime.

Raw slash-command arguments:
`$ARGUMENTS`

Execution mode rules:
- If the raw arguments include `--wait`, do not ask. Run in the foreground.
- If the raw arguments include `--background`, do not ask. Run in a Claude background task.
- Otherwise, use `AskUserQuestion` exactly once with two options:
  - `Wait for results (Recommended)`
  - `Run in background`

Foreground flow:
- Run:
```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/cursor-companion.mjs" task $ARGUMENTS
```
- Return the command stdout verbatim, exactly as-is.
- Do not paraphrase, summarize, or add commentary.

Background flow:
- Launch the task with `Bash` in the background:
```typescript
Bash({
  command: `node "${CLAUDE_PLUGIN_ROOT}/scripts/cursor-companion.mjs" task --background $ARGUMENTS`,
  description: "Cursor Agent task",
  run_in_background: true
})
```
- After launching, tell the user: "Cursor Agent task started in the background. Check `/cursor:status` for progress."
