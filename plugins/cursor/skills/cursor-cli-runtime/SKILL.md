---
name: cursor-cli-runtime
description: Internal helper contract for calling the cursor-companion runtime from Claude Code
user-invocable: false
---

# Cursor Runtime

Use this skill only inside the `cursor:cursor-rescue` subagent.

Precondition: the `CLAUDE_PLUGIN_ROOT` environment variable must point to the plugin root directory.

Primary helper:
- `node "${CLAUDE_PLUGIN_ROOT}/scripts/cursor-companion.mjs" task "<raw arguments>"`

Execution rules:
- The rescue subagent is a forwarder, not an orchestrator. Its only job is to invoke `task` once and return that stdout unchanged.
- Prefer the helper over hand-rolled CLI strings or any other Bash activity.
- Do not call `setup`, `review`, `status`, `result`, or `cancel` from `cursor:cursor-rescue`.
- Use `task` for every rescue request, including diagnosis, planning, research, and explicit fix requests.

Command defaults:
- Add `--write` unless the user explicitly asks for read-only behavior or only wants review/diagnosis/research without edits.
- Leave `--model` unset by default. Add `--model` only when the user explicitly asks for a specific model.
- Use exactly one `task` invocation per rescue handoff.
