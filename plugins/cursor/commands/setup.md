---
description: Check whether cursor-agent CLI is ready and authenticated
allowed-tools: Bash(node:*), Bash(which:*), Bash(cursor-agent:*), AskUserQuestion
---

Run:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/cursor-companion.mjs" setup --json
```

If the result says cursor-agent is unavailable:
- Tell the user cursor-agent is not installed and suggest they install it via their package manager or from cursor.com.

If cursor-agent is installed but not authenticated:
- Tell the user to run `!cursor-agent login` to authenticate.

Output rules:
- Present the final setup output to the user.
- If cursor-agent is installed but not authenticated, preserve the guidance to run `!cursor-agent login`.
