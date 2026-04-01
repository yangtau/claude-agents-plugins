# Claude Agents — Multi-Agent Marketplace for Claude Code

A unified marketplace for Claude Code that brings together multiple AI coding agents. Currently includes:

- **Cursor Agent** — delegate coding tasks, code reviews, and investigations to Cursor Agent
- **Codex** — OpenAI's coding agent for code review and task delegation

## Prerequisites

- [Claude Code](https://claude.ai/code) CLI installed
- For Cursor Agent: [cursor-agent](https://cursor.com) CLI installed and authenticated (`cursor-agent login`)
- For Codex: [codex](https://github.com/openai/codex) CLI installed and authenticated (`codex login`)
- Node.js 18.18 or later

## Installation

In Claude Code, run the following commands:

```
/plugin marketplace add yangtau/claude-agents-plugins
/plugin install cursor@claude-agents
/plugin install codex@claude-agents
/reload-plugins
```

Verify with:

```
/cursor:setup
/codex:setup
```

---

## Cursor Agent Commands

| Command | Description |
|---|---|
| `/cursor:setup` | Check cursor-agent availability and auth status |
| `/cursor:rescue <prompt>` | Delegate investigation, fixes, or follow-up rescue work to Cursor Agent |
| `/cursor:review [focus]` | Run a code review using Cursor Agent |
| `/cursor:model` | List models, or set the workspace default model (`/cursor:model <id>`; `--clear` to reset) |
| `/cursor:status [job-id]` | Show active and recent jobs |
| `/cursor:result [job-id]` | Show output of a completed job |
| `/cursor:cancel [job-id]` | Cancel a running background job |
| `/cursor:execute-plan [path]` | Execute a Claude Code plan using Cursor Agent |

### Cursor Rescue Examples

```bash
# Basic rescue request
/cursor:rescue "refactor the auth module to use JWT"

# With a specific model (overrides workspace default for this run only)
/cursor:rescue --model grok-4-20 "add error handling to the API layer"

# Set default model for this workspace (then omit --model on rescue runs)
/cursor:model grok-4-20

# Continue the previous rescue thread
/cursor:rescue --resume "continue the previous task"

# Run in background
/cursor:rescue --background "migrate the database schema"

# Execute a Claude Code plan (auto-detects latest plan in ~/.claude/plans/)
/cursor:execute-plan
# Or specify a plan file explicitly
/cursor:execute-plan ~/.claude/plans/my-plan.md
```

---

## Codex Commands

| Command | Description |
|---|---|
| `/codex:setup` | Check Codex availability and auth status |
| `/codex:rescue <prompt>` | Delegate investigation, fixes, or follow-up rescue work to the Codex rescue subagent |
| `/codex:review` | Run a code review using Codex |
| `/codex:adversarial-review [focus]` | Run an adversarial code review using Codex |
| `/codex:model` | List models, or set the workspace default model (`/codex:model <id>`; `--clear` to reset) |
| `/codex:status [job-id]` | Show active and recent jobs |
| `/codex:result [job-id]` | Show output of a completed job |
| `/codex:cancel [job-id]` | Cancel a running background job |
| `/codex:execute-plan [path]` | Execute a Claude Code plan using Codex |

### Codex Rescue Examples

```bash
# Basic rescue request
/codex:rescue "refactor the auth module to use JWT"

# With a specific model (overrides workspace default for this run only)
/codex:rescue --model gpt-5.3-codex-spark "optimize the database queries"

# Set default model for this workspace (then omit --model on rescue runs)
/codex:model spark

# With reasoning effort level
/codex:rescue --effort high "design a new caching layer"

# Run in background
/codex:rescue --background "migrate the database schema"

# Resume last conversation
/codex:rescue --resume "continue the previous task"

# Run code review
/codex:review

# Execute a Claude Code plan (auto-detects latest plan in ~/.claude/plans/)
/codex:execute-plan
# Or specify a plan file explicitly
/codex:execute-plan ~/.claude/plans/my-plan.md
```

---

## Architecture

```
.claude-plugin/marketplace.json     Marketplace registry
plugins/
  cursor/                           Cursor Agent plugin
    .claude-plugin/plugin.json      Plugin manifest
    commands/                       8 slash commands
    agents/cursor-rescue.md         Auto-delegation subagent
    skills/                         Internal skills
    scripts/                        Companion scripts
  codex/                            Codex plugin (OpenAI)
    .claude-plugin/plugin.json      Plugin manifest
    commands/                       9 slash commands (including execute-plan)
    agents/codex-rescue.md          Auto-delegation subagent
    skills/                         GPT-5.4 prompting, result handling
    scripts/                        Codex companion scripts
```

## How It Works

All commands invoke the respective CLI tools in headless mode under the hood:
- **Cursor**: `cursor-agent -p --trust`
- **Codex**: `codex --approval-mode full-auto` (or similar)

Tasks can run in foreground (blocking) or background (detached worker process). Job state is persisted in `~/.claude/plugins/state/` for tracking and retrieval.

## License

This marketplace contains plugins with different licenses:

- **Cursor Agent plugin**: MIT License (see `LICENSE`)
- **Codex plugin**: Apache License 2.0 (see `plugins/codex/LICENSE`) — Copyright OpenAI

Each plugin retains its original license and copyright as specified in its respective directory.
