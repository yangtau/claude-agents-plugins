#!/usr/bin/env node

/**
 * Session lifecycle hook for Cursor Companion.
 * - SessionStart: generates and exports CURSOR_COMPANION_SESSION_ID
 * - SessionEnd: cleans up session jobs
 */

import crypto from "node:crypto";
import fs from "node:fs";
import process from "node:process";

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
  // Session cleanup is handled by state expiry; nothing critical to do here.
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
