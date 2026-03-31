export function renderSetupReport(report) {
  const lines = [];
  lines.push("# Cursor Agent Setup\n");

  const status = (available) => (available ? "OK" : "MISSING");

  lines.push(`- **cursor-agent**: ${status(report.cursor.available)} — ${report.cursor.detail}`);
  lines.push(`- **Auth**: ${status(report.auth.loggedIn)} — ${report.auth.detail}`);
  lines.push(`- **Ready**: ${report.ready ? "Yes" : "No"}`);

  if (report.nextSteps.length > 0) {
    lines.push("\n## Next Steps\n");
    for (const step of report.nextSteps) {
      lines.push(`- ${step}`);
    }
  }

  return lines.join("\n") + "\n";
}

export function renderTaskResult(result, options = {}) {
  const lines = [];
  const title = options.title || "Cursor Agent Task";

  lines.push(`## ${title}\n`);

  if (result.status !== 0 && result.stderr) {
    lines.push(`**Error** (exit ${result.status}):\n`);
    lines.push("```");
    lines.push(result.stderr);
    lines.push("```\n");
  }

  if (result.stdout) {
    lines.push(result.stdout);
  }

  if (options.jobId) {
    lines.push(`\n---\nJob: ${options.jobId}`);
  }

  return lines.join("\n") + "\n";
}

export function renderReviewResult(result) {
  const lines = [];
  lines.push("## Cursor Agent Review\n");

  if (result.status !== 0 && result.stderr) {
    lines.push(`**Error** (exit ${result.status}):\n`);
    lines.push("```");
    lines.push(result.stderr);
    lines.push("```\n");
  }

  if (result.stdout) {
    lines.push(result.stdout);
  }

  return lines.join("\n") + "\n";
}

export function renderStatusReport(jobs) {
  if (!jobs || jobs.length === 0) {
    return "No Cursor Agent jobs found.\n";
  }

  const lines = [];
  lines.push("| ID | Kind | Status | Started | Summary |");
  lines.push("|---|---|---|---|---|");
  for (const job of jobs) {
    const started = job.startedAt ? new Date(job.startedAt).toLocaleTimeString() : "-";
    lines.push(`| ${job.id} | ${job.kind || "-"} | ${job.status} | ${started} | ${job.summary || "-"} |`);
  }
  return lines.join("\n") + "\n";
}

export function renderJobDetail(job, stored) {
  const lines = [];
  lines.push(`## Job: ${job.id}\n`);
  lines.push(`- **Kind**: ${job.kind || "-"}`);
  lines.push(`- **Status**: ${job.status}`);
  lines.push(`- **Summary**: ${job.summary || "-"}`);

  if (job.startedAt) lines.push(`- **Started**: ${job.startedAt}`);
  if (job.completedAt) lines.push(`- **Completed**: ${job.completedAt}`);
  if (job.errorMessage) lines.push(`- **Error**: ${job.errorMessage}`);

  if (stored?.result) {
    lines.push("\n### Result\n");
    if (typeof stored.result === "string") {
      lines.push(stored.result);
    } else {
      lines.push("```json");
      lines.push(JSON.stringify(stored.result, null, 2));
      lines.push("```");
    }
  }

  return lines.join("\n") + "\n";
}

export function renderCancelReport(job) {
  return `Cancelled job ${job.id} (${job.title || job.kind || "task"}).\n`;
}
