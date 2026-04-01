---
description: List Cursor Agent models or set the workspace default model
argument-hint: '[<model-id>] [--clear]'
disable-model-invocation: true
allowed-tools: Bash(node:*), Bash(cursor-agent:*)
---

!`node "${CLAUDE_PLUGIN_ROOT}/scripts/cursor-companion.mjs" model $ARGUMENTS`

Present the output to the user.

- With no arguments, the command lists all models (same information as before under `/cursor:models`) and shows whether a workspace default is set.
- With a model id, it saves that model as the default for this workspace; `/cursor:rescue` and `/cursor:review` then use it when `--model` is not passed.
- With `--clear`, the workspace default is removed so Cursor Agent falls back to its own default.
