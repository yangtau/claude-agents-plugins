import { execFileSync, spawnSync } from "node:child_process";

export function binaryAvailable(name, args = ["--version"]) {
  try {
    const result = spawnSync(name, args, {
      timeout: 10000,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    if (result.status === 0) {
      const detail = (result.stdout || "").trim().split("\n")[0];
      return { available: true, detail };
    }
    return { available: false, detail: (result.stderr || "").trim().split("\n")[0] || "non-zero exit" };
  } catch {
    return { available: false, detail: "not found" };
  }
}

export function terminateProcessTree(pid) {
  if (!pid || isNaN(pid)) return;
  try {
    process.kill(-pid, "SIGTERM");
  } catch {
    try {
      process.kill(pid, "SIGTERM");
    } catch {
      // already dead
    }
  }
}
