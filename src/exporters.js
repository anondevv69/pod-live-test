function csvCell(value) {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function decisionRow(decision) {
  return {
    repository: decision.analysis.repository,
    headSha: decision.analysis.headSha,
    status: decision.status,
    counted: decision.counted,
    countPath: decision.countPath ?? "",
    meaningfulFiles: decision.analysis.meaningfulFiles,
    estimatedLines: decision.analysis.lineEstimate,
    score: decision.score,
    risk: decision.risk?.level ?? "",
    reasons: decision.reasons.join("; "),
  };
}

export function decisionsToCsv(decisions) {
  const rows = decisions.map(decisionRow);
  const headers = [
    "repository",
    "headSha",
    "status",
    "counted",
    "countPath",
    "meaningfulFiles",
    "estimatedLines",
    "score",
    "risk",
    "reasons",
  ];
  return [headers.join(","), ...rows.map((row) => headers.map((header) => csvCell(row[header])).join(","))].join("\n");
}

export function decisionsToMarkdown(decisions) {
  const header = "| Repository | Commit | Status | Files | Lines | Score |\n| --- | --- | --- | ---: | ---: | ---: |";
  const rows = decisions.map((decision) => {
    const row = decisionRow(decision);
    return `| ${row.repository} | ${row.headSha.slice(0, 7)} | ${row.status} | ${row.meaningfulFiles} | ${row.estimatedLines} | ${row.score} |`;
  });
  return [header, ...rows].join("\n");
}

export function decisionsToJsonLines(decisions) {
  return decisions.map((decision) => JSON.stringify(decisionRow(decision))).join("\n");
}

export function summaryToCsv(summary) {
  const headers = Object.keys(summary);
  return [headers.join(","), headers.map((header) => csvCell(summary[header])).join(",")].join("\n");
}
