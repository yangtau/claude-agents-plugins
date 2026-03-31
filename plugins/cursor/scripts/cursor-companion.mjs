#!/usr/bin/env node

import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { parseArgs, splitRawArgumentString } from "./lib/args.mjs";
import { getCursorAvailability, getCursorLoginStatus, runCursorAgent } from "./lib/cursor.mjs";
import { binaryAvailable, terminateProcessTree } from "./lib/process-utils.mjs";
import {
  renderSetupReport,
  renderTaskResult,
  renderReviewResult,
  renderStatusReport,
  renderJobDetail,
  renderCancelReport,
} from "./lib/render.mjs";
import {
  generateJobId,
  getConfig,
  listJobs,
  readJobFile,
  setConfig,
  upsertJob,
  writeJobFile,
  removeSessionJobs,
} from "./lib/state.mjs";
import { resolveWorkspaceRoot } from "./lib/workspace.mjs";

const ROOT_DIR = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const SESSION_ID_ENV = "CURSOR_COMPANION_SESSION_ID";

// ── Helpers ──

function printUsage() {
  console.log(
    [
      "Usage:",
      "  cursor-companion setup [--json]",
      "  cursor-companion task [--background] [--write] [--model <model>] [--mode plan|ask] [prompt]",
      "  cursor-companion review [--model <model>] [focus text]",
      "  cursor-companion status [job-id] [--all] [--json]",
      "  cursor-companion result [job-id] [--json]",
      "  cursor-companion models [--json]",
      "  cursor-companion cancel [job-id] [--json]",
    ].join("\n")
  );
}

function outputResult(value, asJson) {
  if (asJson) {
    console.log(JSON.stringify(value, null, 2));
  } else {
    process.stdout.write(typeof value === "string" ? value : JSON.stringify(value, null, 2));
  }
}

function normalizeArgv(argv) {
  if (argv.length === 1) {
    const [raw] = argv;
    if (!raw || !raw.trim()) return [];
    return splitRawArgumentString(raw);
  }
  return argv;
}

function parseCommandInput(argv, config = {}) {
  return parseArgs(normalizeArgv(argv), {
    ...config,
    aliasMap: { C: "cwd", ...(config.aliasMap ?? {}) },
  });
}

function resolveCommandCwd(options = {}) {
  return options.cwd ? path.resolve(process.cwd(), options.cwd) : process.cwd();
}

function resolveCommandWorkspace(options = {}) {
  return resolveWorkspaceRoot(resolveCommandCwd(options));
}

function nowIso() {
  return new Date().toISOString();
}

function shorten(text, limit = 96) {
  const normalized = String(text ?? "")
    .trim()
    .replace(/\s+/g, " ");
  if (!normalized) return "";
  return normalized.length <= limit ? normalized : `${normalized.slice(0, limit - 3)}...`;
}

function ensureCursorReady() {
  const cursor = getCursorAvailability();
  if (!cursor.available) {
    throw new Error("cursor-agent is not installed. Install it from cursor.com or your package manager.");
  }
  const auth = getCursorLoginStatus();
  if (!auth.loggedIn) {
    throw new Error("cursor-agent is not authenticated. Run `!cursor-agent login` to log in.");
  }
}

// ── Setup ──

function handleSetup(argv) {
  const { options } = parseCommandInput(argv, {
    valueOptions: ["cwd"],
    booleanOptions: ["json"],
  });

  const cursor = getCursorAvailability();
  const auth = getCursorLoginStatus();

  const nextSteps = [];
  if (!cursor.available) {
    nextSteps.push("Install cursor-agent from cursor.com or via your package manager.");
  }
  if (cursor.available && !auth.loggedIn) {
    nextSteps.push("Run `!cursor-agent login` to authenticate.");
  }

  const report = {
    ready: cursor.available && auth.loggedIn,
    cursor,
    auth,
    nextSteps,
  };

  outputResult(options.json ? report : renderSetupReport(report), options.json);
}

// ── Task ──

async function handleTask(argv) {
  const { options, positionals } = parseCommandInput(argv, {
    valueOptions: ["model", "mode", "cwd", "prompt-file"],
    booleanOptions: ["json", "write", "background", "wait"],
    aliasMap: { m: "model" },
  });

  const cwd = resolveCommandCwd(options);
  const workspaceRoot = resolveCommandWorkspace(options);
  ensureCursorReady();

  // Read prompt
  let prompt;
  if (options["prompt-file"]) {
    prompt = fs.readFileSync(path.resolve(cwd, options["prompt-file"]), "utf8");
  } else {
    prompt = positionals.join(" ");
  }
  if (!prompt) {
    throw new Error("Provide a prompt for the task.");
  }

  const jobId = generateJobId("task");
  const jobRecord = {
    id: jobId,
    kind: "task",
    status: "running",
    summary: shorten(prompt),
    startedAt: nowIso(),
    sessionId: process.env[SESSION_ID_ENV] ?? null,
    write: Boolean(options.write),
  };

  if (options.background) {
    // Background execution: spawn detached worker
    jobRecord.status = "queued";
    upsertJob(workspaceRoot, jobRecord);

    const scriptPath = path.join(ROOT_DIR, "scripts", "cursor-companion.mjs");
    const child = spawn(
      process.execPath,
      [scriptPath, "task-worker", "--cwd", cwd, "--job-id", jobId],
      {
        cwd,
        env: process.env,
        detached: true,
        stdio: "ignore",
        windowsHide: true,
      }
    );
    child.unref();

    upsertJob(workspaceRoot, { ...jobRecord, pid: child.pid });
    writeJobFile(workspaceRoot, jobId, { ...jobRecord, pid: child.pid, prompt });

    const payload = { jobId, status: "queued", summary: jobRecord.summary };
    outputResult(
      options.json ? payload : `Cursor Agent task started in the background as ${jobId}. Check /cursor:status ${jobId} for progress.\n`,
      options.json
    );
    return;
  }

  // Foreground execution
  upsertJob(workspaceRoot, jobRecord);

  process.stderr.write(`[cursor-companion] Running task: ${shorten(prompt, 60)}...\n`);

  const result = await runCursorAgent({
    prompt,
    workspace: workspaceRoot,
    model: options.model ?? undefined,
    mode: options.mode ?? undefined,
    write: Boolean(options.write),
    outputFormat: "text",
    onData: (text) => process.stderr.write(text),
  });

  const completedJob = {
    ...jobRecord,
    status: result.status === 0 ? "completed" : "failed",
    completedAt: nowIso(),
    errorMessage: result.status !== 0 ? result.stderr : undefined,
  };
  upsertJob(workspaceRoot, completedJob);
  writeJobFile(workspaceRoot, jobId, { ...completedJob, result: result.stdout, prompt });

  const rendered = renderTaskResult(result, { title: "Cursor Agent Task", jobId });
  outputResult(options.json ? { ...completedJob, result: result.stdout } : rendered, options.json);

  if (result.status !== 0) {
    process.exitCode = result.status;
  }
}

// ── Task Worker (background execution) ──

async function handleTaskWorker(argv) {
  const { options } = parseCommandInput(argv, {
    valueOptions: ["cwd", "job-id"],
  });

  if (!options["job-id"]) {
    throw new Error("Missing required --job-id for task-worker.");
  }

  const cwd = resolveCommandCwd(options);
  const workspaceRoot = resolveCommandWorkspace(options);
  const stored = readJobFile(workspaceRoot, options["job-id"]);
  if (!stored) {
    throw new Error(`No stored job found for ${options["job-id"]}.`);
  }

  upsertJob(workspaceRoot, { id: stored.id, status: "running", startedAt: nowIso() });

  const result = await runCursorAgent({
    prompt: stored.prompt,
    workspace: workspaceRoot,
    model: stored.model ?? undefined,
    mode: stored.mode ?? undefined,
    write: Boolean(stored.write),
    outputFormat: "text",
  });

  const completedJob = {
    id: stored.id,
    kind: stored.kind,
    status: result.status === 0 ? "completed" : "failed",
    completedAt: nowIso(),
    summary: stored.summary,
    errorMessage: result.status !== 0 ? result.stderr : undefined,
  };
  upsertJob(workspaceRoot, completedJob);
  writeJobFile(workspaceRoot, stored.id, { ...stored, ...completedJob, result: result.stdout });
}

// ── Review ──

async function handleReview(argv) {
  const { options, positionals } = parseCommandInput(argv, {
    valueOptions: ["model", "cwd"],
    booleanOptions: ["json", "background", "wait"],
    aliasMap: { m: "model" },
  });

  const cwd = resolveCommandCwd(options);
  const workspaceRoot = resolveCommandWorkspace(options);
  ensureCursorReady();

  // Build review prompt from git diff
  let diffContext = "";
  try {
    const { execFileSync } = await import("node:child_process");
    diffContext = execFileSync("git", ["diff", "--cached", "--stat"], {
      cwd: workspaceRoot,
      encoding: "utf8",
      timeout: 10000,
    }).trim();
    if (!diffContext) {
      diffContext = execFileSync("git", ["diff", "--stat"], {
        cwd: workspaceRoot,
        encoding: "utf8",
        timeout: 10000,
      }).trim();
    }
    if (!diffContext) {
      diffContext = execFileSync("git", ["diff", "HEAD~1", "--stat"], {
        cwd: workspaceRoot,
        encoding: "utf8",
        timeout: 10000,
      }).trim();
    }
  } catch {
    // no git context available
  }

  const focusText = positionals.join(" ").trim();
  const reviewPrompt = [
    "Review the current code changes in this repository.",
    "Focus on: bugs, logic errors, security vulnerabilities, code quality issues, and potential improvements.",
    diffContext ? `\nChanged files:\n${diffContext}` : "",
    focusText ? `\nSpecific focus: ${focusText}` : "",
    "\nProvide a structured review with severity levels (critical/high/medium/low) for each finding.",
  ]
    .filter(Boolean)
    .join("\n");

  const jobId = generateJobId("review");
  const jobRecord = {
    id: jobId,
    kind: "review",
    status: "running",
    summary: focusText ? shorten(`Review: ${focusText}`) : "Code review",
    startedAt: nowIso(),
    sessionId: process.env[SESSION_ID_ENV] ?? null,
  };
  upsertJob(workspaceRoot, jobRecord);

  process.stderr.write("[cursor-companion] Running review...\n");

  const result = await runCursorAgent({
    prompt: reviewPrompt,
    workspace: workspaceRoot,
    model: options.model ?? undefined,
    mode: "ask",
    write: false,
    outputFormat: "text",
    onData: (text) => process.stderr.write(text),
  });

  const completedJob = {
    ...jobRecord,
    status: result.status === 0 ? "completed" : "failed",
    completedAt: nowIso(),
    errorMessage: result.status !== 0 ? result.stderr : undefined,
  };
  upsertJob(workspaceRoot, completedJob);
  writeJobFile(workspaceRoot, jobId, { ...completedJob, result: result.stdout });

  const rendered = renderReviewResult(result);
  outputResult(options.json ? { ...completedJob, result: result.stdout } : rendered, options.json);

  if (result.status !== 0) {
    process.exitCode = result.status;
  }
}

// ── Status ──

function handleStatus(argv) {
  const { options, positionals } = parseCommandInput(argv, {
    valueOptions: ["cwd"],
    booleanOptions: ["json", "all"],
  });

  const cwd = resolveCommandCwd(options);
  const workspaceRoot = resolveCommandWorkspace(options);
  const reference = positionals[0] ?? "";

  if (reference) {
    // Show single job
    const jobs = listJobs(workspaceRoot);
    const job = jobs.find((j) => j.id === reference);
    if (!job) {
      throw new Error(`Job not found: ${reference}`);
    }
    const stored = readJobFile(workspaceRoot, job.id);
    outputResult(
      options.json ? { job, stored } : renderJobDetail(job, stored),
      options.json
    );
    return;
  }

  // List all jobs
  let jobs = listJobs(workspaceRoot);
  if (!options.all) {
    const sessionId = process.env[SESSION_ID_ENV] ?? null;
    if (sessionId) {
      jobs = jobs.filter((j) => j.sessionId === sessionId);
    }
    // Show last 10 by default
    jobs = jobs.slice(-10);
  }

  outputResult(options.json ? { jobs } : renderStatusReport(jobs), options.json);
}

// ── Result ──

function handleResult(argv) {
  const { options, positionals } = parseCommandInput(argv, {
    valueOptions: ["cwd"],
    booleanOptions: ["json"],
  });

  const cwd = resolveCommandCwd(options);
  const workspaceRoot = resolveCommandWorkspace(options);
  const reference = positionals[0] ?? "";

  // Find the job
  const jobs = listJobs(workspaceRoot);
  let job;
  if (reference) {
    job = jobs.find((j) => j.id === reference);
  } else {
    // Find latest completed job
    job = [...jobs].reverse().find((j) => j.status === "completed" || j.status === "failed");
  }
  if (!job) {
    throw new Error(reference ? `Job not found: ${reference}` : "No completed jobs found.");
  }

  const stored = readJobFile(workspaceRoot, job.id);
  outputResult(
    options.json ? { job, stored } : renderJobDetail(job, stored),
    options.json
  );
}

// ── Models ──

async function handleModels(argv) {
  const { options } = parseCommandInput(argv, {
    booleanOptions: ["json"],
  });

  const { execFileSync } = await import("node:child_process");
  let raw = "";
  try {
    raw = execFileSync("cursor-agent", ["--list-models"], {
      encoding: "utf8",
      timeout: 30000,
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (err) {
    throw new Error("Failed to list models. Is cursor-agent installed and authenticated?");
  }

  // Strip ANSI escape sequences from cursor-agent output
  const clean = raw.replace(/\x1b\[[0-9;]*[A-Za-z]|\x1b\].*?\x07/g, "").trim();

  // Parse into structured data
  const models = [];
  for (const line of clean.split("\n")) {
    const match = line.match(/^(\S+)\s+-\s+(.+?)(?:\s+\((default|current)\))?$/);
    if (match) {
      models.push({
        id: match[1],
        name: match[2].trim(),
        ...(match[3] ? { tag: match[3] } : {}),
      });
    }
  }

  if (options.json) {
    outputResult({ models }, true);
  } else {
    const lines = ["## Available Cursor Agent Models\n"];
    for (const m of models) {
      const tag = m.tag ? ` (${m.tag})` : "";
      lines.push(`- **${m.id}** — ${m.name}${tag}`);
    }
    lines.push("\n---");
    lines.push("Use `--model <id>` when running a task:");
    lines.push("  `/cursor:task --model grok-4-20 \"your prompt\"`");
    outputResult(lines.join("\n") + "\n", false);
  }
}

// ── Cancel ──

function handleCancel(argv) {
  const { options, positionals } = parseCommandInput(argv, {
    valueOptions: ["cwd"],
    booleanOptions: ["json"],
  });

  const cwd = resolveCommandCwd(options);
  const workspaceRoot = resolveCommandWorkspace(options);
  const reference = positionals[0] ?? "";

  const jobs = listJobs(workspaceRoot);
  let job;
  if (reference) {
    job = jobs.find((j) => j.id === reference);
  } else {
    // Find latest running job
    job = [...jobs].reverse().find((j) => j.status === "running" || j.status === "queued");
  }
  if (!job) {
    throw new Error(reference ? `Job not found: ${reference}` : "No active jobs to cancel.");
  }

  // Kill the process
  if (job.pid) {
    terminateProcessTree(job.pid);
  }

  const cancelledJob = {
    ...job,
    status: "cancelled",
    completedAt: nowIso(),
    errorMessage: "Cancelled by user.",
  };
  upsertJob(workspaceRoot, cancelledJob);
  writeJobFile(workspaceRoot, job.id, {
    ...(readJobFile(workspaceRoot, job.id) ?? {}),
    ...cancelledJob,
  });

  outputResult(
    options.json ? { jobId: job.id, status: "cancelled" } : renderCancelReport(cancelledJob),
    options.json
  );
}

// ── Main ──

async function main() {
  const [subcommand, ...argv] = process.argv.slice(2);
  if (!subcommand || subcommand === "help" || subcommand === "--help") {
    printUsage();
    return;
  }

  switch (subcommand) {
    case "setup":
      handleSetup(argv);
      break;
    case "task":
      await handleTask(argv);
      break;
    case "task-worker":
      await handleTaskWorker(argv);
      break;
    case "review":
      await handleReview(argv);
      break;
    case "status":
      handleStatus(argv);
      break;
    case "result":
      handleResult(argv);
      break;
    case "models":
      await handleModels(argv);
      break;
    case "cancel":
      handleCancel(argv);
      break;
    default:
      throw new Error(`Unknown subcommand: ${subcommand}`);
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
