---
description: Show Codex model aliases or set the workspace default model
argument-hint: '[<model-id|spark>] [--clear]'
disable-model-invocation: true
allowed-tools: Bash(node:*)
---

!`node "${CLAUDE_PLUGIN_ROOT}/scripts/codex-companion.mjs" model $ARGUMENTS`

Present the output to the user.

- With no arguments, the command shows the current workspace default model and the known aliases that Codex accepts here.
- With a model id or alias such as `spark`, it saves that value as the default for this workspace; `/codex:task` then uses it when `--model` is not passed.
- With `--clear`, the workspace default is removed so Codex falls back to its own default.
