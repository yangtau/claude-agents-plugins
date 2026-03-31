# Cursor Companion — Claude Code Plugin

A Claude Code plugin that wraps [cursor-agent](https://cursor.com) CLI, enabling you to delegate coding tasks, code reviews, and investigations to Cursor Agent directly from Claude Code.

## Prerequisites

- [Claude Code](https://claude.ai/code) CLI installed
- [cursor-agent](https://cursor.com) CLI installed and authenticated (`cursor-agent login`)
- Node.js 18.18 or later

## Installation

In Claude Code, run the following commands:

```
/plugin marketplace add yangtau/claude-cursor-plugin
/plugin install cursor@cursor-companion
/reload-plugins
```

Verify with:

```
/cursor:setup
```

## Commands

| Command | Description |
|---|---|
| `/cursor:setup` | Check cursor-agent availability and auth status |
| `/cursor:task <prompt>` | Delegate a coding task to Cursor Agent |
| `/cursor:review [focus]` | Run a code review using Cursor Agent |
| `/cursor:models` | List available models |
| `/cursor:status [job-id]` | Show active and recent jobs |
| `/cursor:result [job-id]` | Show output of a completed job |
| `/cursor:cancel [job-id]` | Cancel a running background job |

### Task examples

```bash
# Basic task
/cursor:task "refactor the auth module to use JWT"

# With a specific model
/cursor:task --model grok-4-20 "add error handling to the API layer"

# Write mode (allows file edits)
/cursor:task --write "fix the failing tests in src/utils"

# Run in background
/cursor:task --background --write "migrate the database schema"

# Read-only planning
/cursor:task --mode plan "design the caching strategy"
```

## Agent

The plugin includes a **cursor-rescue** subagent that Claude Code can invoke proactively when it gets stuck on a complex debugging or implementation task. This works automatically — no manual invocation needed.

## Architecture

```
.claude-plugin/marketplace.json     Marketplace registry
plugins/cursor/
  .claude-plugin/plugin.json        Plugin manifest
  commands/                         7 slash commands (setup, task, review, models, status, result, cancel)
  agents/cursor-rescue.md           Auto-delegation subagent
  skills/cursor-cli-runtime/        Internal runtime contract
  hooks/hooks.json                  Session lifecycle hooks
  scripts/
    cursor-companion.mjs            Main script wrapping cursor-agent -p (headless mode)
    session-lifecycle-hook.mjs      Session start/end handler
    lib/                            Shared modules (state, args, cursor, render, etc.)
```

## How it works

All commands invoke `cursor-agent` in headless print mode (`-p --trust`) under the hood. Tasks can run in foreground (blocking) or background (detached worker process). Job state is persisted in `~/.claude/plugins/state/` for tracking and retrieval.

## License

MIT
