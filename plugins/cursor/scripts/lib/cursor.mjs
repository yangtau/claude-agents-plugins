import { spawn } from "node:child_process";
import { execFileSync } from "node:child_process";

/**
 * Check if cursor-agent is available and get version info.
 */
export function getCursorAvailability() {
  try {
    const result = execFileSync("cursor-agent", ["about"], {
      encoding: "utf8",
      timeout: 15000,
      stdio: ["ignore", "pipe", "pipe"],
    });
    const versionMatch = result.match(/Version:\s*(.+)/i) || result.match(/(\d{4}\.\d{2}\.\d{2}[^\s]*)/);
    const detail = versionMatch ? versionMatch[1].trim() : result.trim().split("\n")[0];
    return { available: true, detail };
  } catch {
    return { available: false, detail: "cursor-agent not found" };
  }
}

/**
 * Check if cursor-agent is authenticated.
 */
export function getCursorLoginStatus() {
  try {
    const result = execFileSync("cursor-agent", ["status"], {
      encoding: "utf8",
      timeout: 15000,
      stdio: ["ignore", "pipe", "pipe"],
    });
    const loggedIn = /logged in|authenticated|email/i.test(result);
    return { available: true, loggedIn, detail: loggedIn ? "authenticated" : "not authenticated" };
  } catch {
    return { available: false, loggedIn: false, detail: "cursor-agent not found" };
  }
}

/**
 * Run cursor-agent in headless/print mode.
 * Returns a promise that resolves with { status, stdout, stderr }.
 */
export function runCursorAgent(options = {}) {
  const {
    prompt,
    workspace,
    model,
    mode, // "plan", "ask", or undefined (default agent mode)
    write = false,
    outputFormat = "text",
    onData,
    signal,
  } = options;

  return new Promise((resolve, reject) => {
    const args = ["-p", "--trust"];

    if (write) {
      args.push("--yolo");
    }

    if (outputFormat) {
      args.push("--output-format", outputFormat);
    }

    if (outputFormat === "stream-json") {
      args.push("--stream-partial-output");
    }

    if (workspace) {
      args.push("--workspace", workspace);
    }

    if (model) {
      args.push("--model", model);
    }

    if (mode) {
      args.push("--mode", mode);
    }

    if (prompt) {
      args.push(prompt);
    }

    const child = spawn("cursor-agent", args, {
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env },
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      const text = chunk.toString();
      stdout += text;
      onData?.(text);
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    if (signal) {
      signal.addEventListener("abort", () => {
        child.kill("SIGTERM");
      });
    }

    child.on("close", (code) => {
      resolve({
        status: code ?? 0,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
      });
    });

    child.on("error", (err) => {
      reject(err);
    });
  });
}

/**
 * Run cursor-agent as a detached background process.
 * Returns the child process (already unref'd).
 */
export function spawnDetachedCursorAgent(args, cwd) {
  const child = spawn("cursor-agent", args, {
    cwd,
    detached: true,
    stdio: "ignore",
    env: { ...process.env },
  });
  child.unref();
  return child;
}
