---
description: Show the stored final output for a finished Cursor Agent job
argument-hint: '[job-id]'
disable-model-invocation: true
allowed-tools: Bash(node:*)
---

!`node "${CLAUDE_PLUGIN_ROOT}/scripts/cursor-companion.mjs" result $ARGUMENTS`

Present the full command output to the user. Do not summarize or condense it. Preserve all details including:
- Job ID and status
- The complete result payload and any reasoning summary
- File paths and line numbers exactly as reported
- Any error messages
- Follow-up commands such as `/cursor:status <id>` and `/cursor:cancel <id>` when present
