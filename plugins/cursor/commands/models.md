---
description: List available Cursor Agent models and show how to select one
disable-model-invocation: true
allowed-tools: Bash(node:*), Bash(cursor-agent:*)
---

!`node "${CLAUDE_PLUGIN_ROOT}/scripts/cursor-companion.mjs" models`

Present the output to the user. After listing the models, remind the user they can select a model when running a task:
- `/cursor:task --model <model-id> "your prompt"`
