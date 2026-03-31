---
description: Cancel an active background Cursor Agent job
argument-hint: '[job-id]'
disable-model-invocation: true
allowed-tools: Bash(node:*)
---

!`node "${CLAUDE_PLUGIN_ROOT}/scripts/cursor-companion.mjs" cancel $ARGUMENTS`

Present the full command output to the user. Do not summarize or condense it. Preserve all details including:
- The cancelled job ID
- The job kind and summary
- Follow-up commands such as `/cursor:status`
