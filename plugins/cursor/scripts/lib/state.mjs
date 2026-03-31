import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const STATE_ROOT = path.join(os.homedir(), ".claude", "plugins", "state");
const MAX_JOBS = 50;

function workspaceSlug(workspaceRoot) {
  const hash = crypto.createHash("sha256").update(workspaceRoot).digest("hex").slice(0, 12);
  const name = path.basename(workspaceRoot).replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 32);
  return `cursor-${name}-${hash}`;
}

function stateDir(workspaceRoot) {
  return path.join(STATE_ROOT, workspaceSlug(workspaceRoot));
}

function statePath(workspaceRoot) {
  return path.join(stateDir(workspaceRoot), "state.json");
}

function jobsDir(workspaceRoot) {
  return path.join(stateDir(workspaceRoot), "jobs");
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function readState(workspaceRoot) {
  const p = statePath(workspaceRoot);
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return { config: {}, jobs: [] };
  }
}

function writeState(workspaceRoot, state) {
  ensureDir(stateDir(workspaceRoot));
  fs.writeFileSync(statePath(workspaceRoot), JSON.stringify(state, null, 2));
}

export function getConfig(workspaceRoot) {
  return readState(workspaceRoot).config ?? {};
}

export function setConfig(workspaceRoot, key, value) {
  const state = readState(workspaceRoot);
  state.config = state.config ?? {};
  state.config[key] = value;
  writeState(workspaceRoot, state);
}

export function generateJobId(prefix = "job") {
  const ts = Date.now().toString(36);
  const rand = crypto.randomBytes(3).toString("hex");
  return `${prefix}-${ts}-${rand}`;
}

export function listJobs(workspaceRoot) {
  const state = readState(workspaceRoot);
  return state.jobs ?? [];
}

export function upsertJob(workspaceRoot, job) {
  const state = readState(workspaceRoot);
  state.jobs = state.jobs ?? [];
  const idx = state.jobs.findIndex((j) => j.id === job.id);
  if (idx >= 0) {
    state.jobs[idx] = { ...state.jobs[idx], ...job };
  } else {
    state.jobs.push(job);
  }
  // Prune old jobs
  if (state.jobs.length > MAX_JOBS) {
    state.jobs = state.jobs.slice(-MAX_JOBS);
  }
  writeState(workspaceRoot, state);
}

export function writeJobFile(workspaceRoot, jobId, data) {
  const dir = jobsDir(workspaceRoot);
  ensureDir(dir);
  fs.writeFileSync(path.join(dir, `${jobId}.json`), JSON.stringify(data, null, 2));
}

export function readJobFile(workspaceRoot, jobId) {
  try {
    return JSON.parse(fs.readFileSync(path.join(jobsDir(workspaceRoot), `${jobId}.json`), "utf8"));
  } catch {
    return null;
  }
}

export function removeSessionJobs(workspaceRoot, sessionId) {
  const state = readState(workspaceRoot);
  state.jobs = (state.jobs ?? []).filter(
    (j) => j.sessionId !== sessionId || j.status === "completed" || j.status === "failed"
  );
  writeState(workspaceRoot, state);
}
