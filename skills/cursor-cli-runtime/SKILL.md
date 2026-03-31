---
name: cursor-cli-runtime
description: Internal helper contract for calling the cursor-companion runtime from Claude Code
user-invocable: false
---

# Cursor Runtime

Use this skill only inside the `cursor:cursor-rescue` subagent.

Primary helper:
- `node "${CLAUDE_PLUGIN_ROOT}/scripts/cursor-companion.mjs" task "<raw arguments>"`

Execution rules:
- The rescue subagent is a forwarder, not an orchestrator. Its only job is to invoke `task` once and return that stdout unchanged.
- Prefer the helper over hand-rolled CLI strings or any other Bash activity.
- Do not call `setup`, `review`, `status`, `result`, or `cancel` from `cursor:cursor-rescue`.
- Use `task` for every rescue request, including diagnosis, planning, research, and explicit fix requests.
- Default to a write-capable Cursor run by adding `--write` unless the user explicitly asks for read-only behavior.
- Leave model unset by default. Add `--model` only when the user explicitly asks for one.

Command selection:
- Use exactly one `task` invocation per rescue handoff.
- Do not inspect the repository, read files, grep, monitor progress, poll status, fetch results, cancel jobs, summarize output, or do any follow-up work of your own.
- Return the stdout of the `task` command exactly as-is.
- If the Bash call fails or Cursor cannot be invoked, return nothing.
