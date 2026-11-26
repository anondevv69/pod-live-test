import { decisionLabel } from "./decisions.js";
import { summarizeFiles } from "./analyzer.js";

function line(label, value) {
  return `${label}: ${value}`;
}

export function renderDecisionReport(decision) {
  const { analysis } = decision;
  const files = summarizeFiles(analysis.files);
  const rows = [
    line("Repository", analysis.repository),
    line("Commit", analysis.headSha),
    line("Author", analysis.author),
    line("Decision", decisionLabel(decision)),
    line("Meaningful files", analysis.meaningfulFiles),
    line("Estimated lines", analysis.lineEstimate),
    line("Checks", `${analysis.checks.passed}/${analysis.checks.required} required checks passed`),
    line("Reviews", `${analysis.reviews.passCount}/${analysis.reviews.requiredPasses} independent passes`),
    line("Readiness", `${decision.score} (${decision.band})`),
    line("File extensions", JSON.stringify(files.byExtension)),
    line("Reasons", decision.reasons.join("; ")),
  ];
  if (decision.window) {
    rows.push(line("Review window", `${decision.window.state}; expires ${decision.window.expiresAt}`));
  }
  return rows.join("\n");
}

export function decisionToJson(decision) {
  return JSON.stringify(decision, null, 2);
}

export function renderBatchSummary(decisions) {
  const counts = { counted: 0, pending: 0, rejected: 0 };
  for (const decision of decisions) {
    if (decision.counted) counts.counted += 1;
    else if (decision.status === "pending-review") counts.pending += 1;
    else counts.rejected += 1;
  }
  return {
    total: decisions.length,
    ...counts,
    totalEstimatedLines: decisions.reduce((sum, decision) => sum + decision.analysis.lineEstimate, 0),
    repositories: [...new Set(decisions.map((decision) => decision.analysis.repository))],
  };
}
