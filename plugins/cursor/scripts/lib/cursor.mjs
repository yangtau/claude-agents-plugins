import { spawn, execFileSync, spawnSync } from "node:child_process";

function stripAnsi(text) {
  return String(text ?? "").replace(/\x1b\[[0-9;]*[A-Za-z]|\x1b\].*?\x07/g, "");
}

function extractChatId(text) {
  const match = String(text ?? "").match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  return match ? match[0] : null;
}

/**
 * Check if cursor-agent is available and get version info.
 */
export function getCursorAvailability() {
  try {
    const result = execFileSync("cursor-agent", ["--version"], {
      encoding: "utf8",
      timeout: 15000,
      stdio: ["ignore", "pipe", "pipe"],
    });
    const clean = stripAnsi(result).trim();
    const versionMatch = clean.match(/(\d{4}\.\d{2}\.\d{2}[^\s]*)/);
    const detail = versionMatch ? versionMatch[1].trim() : clean.split("\n")[0];
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
  } catch (error) {
    if (error && typeof error === "object" && error.code === "ENOENT") {
      return { available: false, loggedIn: false, detail: "cursor-agent not found" };
    }

    const stdout = typeof error?.stdout === "string" ? stripAnsi(error.stdout).trim() : "";
    const stderr = typeof error?.stderr === "string" ? stripAnsi(error.stderr).trim() : "";
    const detail = [stdout, stderr].filter(Boolean).join(" ").trim() || "not authenticated";
    return { available: true, loggedIn: false, detail };
  }
}

export function createCursorChat(options = {}) {
  const result = spawnSync("cursor-agent", ["create-chat"], {
    cwd: options.cwd,
    encoding: "utf8",
    timeout: options.timeout ?? 30000,
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, ...(options.env ?? {}) },
  });

  const stdout = result.stdout ?? "";
  const stderr = result.stderr ?? "";
  const chatId = extractChatId(stdout);
  if (!chatId) {
    const detail = [stdout, stderr, result.error?.message ?? ""].filter(Boolean).join("\n").trim();
    throw new Error(detail || "Failed to create a Cursor chat.");
  }

  return {
    chatId,
    stdout: stdout.trim(),
    stderr: stderr.trim(),
    status: result.status ?? 0,
  };
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
    chatId,
    mode, // "plan", "ask", or undefined (default agent mode)
    write = false,
    outputFormat = "text",
    onData,
    signal,
  } = options;

  return new Promise((resolve, reject) => {
    const args = [];

    if (chatId) {
      args.push("--resume", chatId);
    }

    args.push("-p", "--trust");

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
        chatId: chatId ?? null,
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
