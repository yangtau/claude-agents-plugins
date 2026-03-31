#!/usr/bin/env node

/**
 * Session lifecycle hook for Cursor Companion.
 * - SessionStart: generates and exports CURSOR_COMPANION_SESSION_ID
 * - SessionEnd: cleans up session jobs
 */

import crypto from "node:crypto";
import fs from "node:fs";
import process from "node:process";

import { removeSessionJobs } from "./lib/state.mjs";
import { resolveWorkspaceRoot } from "./lib/workspace.mjs";

const SESSION_ID_ENV = "CURSOR_COMPANION_SESSION_ID";

function readHookInput() {
  try {
    const raw = fs.readFileSync(0, "utf8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function handleSessionStart() {
  const sessionId = crypto.randomUUID();
  const envFile = process.env.CLAUDE_ENV_FILE;
  if (envFile) {
    fs.appendFileSync(envFile, `${SESSION_ID_ENV}=${sessionId}\n`);
  }
}

function handleSessionEnd() {
  const sessionId = process.env[SESSION_ID_ENV];
  if (sessionId) {
    try {
      const workspaceRoot = resolveWorkspaceRoot(process.cwd());
      removeSessionJobs(workspaceRoot, sessionId);
    } catch {
      // best-effort cleanup
    }
  }
}

const event = process.argv[2];
readHookInput(); // consume stdin to avoid pipe errors

switch (event) {
  case "SessionStart":
    handleSessionStart();
    break;
  case "SessionEnd":
    handleSessionEnd();
    break;
  default:
    process.stderr.write(`Unknown lifecycle event: ${event}\n`);
    process.exitCode = 1;
}
