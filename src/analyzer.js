import { DEFAULT_POLICY, isIgnoredPath, isProductionBranch } from "./policy.js";
import { changedLines, checkScore, estimatedLines, reviewScore } from "./scoring.js";
import { normalizeChangeBatch } from "./validation.js";

export function analyzeChangeBatch(input, policy = DEFAULT_POLICY) {
  const batch = normalizeChangeBatch(input);
  const meaningfulFiles = batch.files.filter((file) => !isIgnoredPath(file.path, policy));
  const ignoredFiles = batch.files.filter((file) => isIgnoredPath(file.path, policy));
  const actualLines = changedLines(meaningfulFiles);
  const fileEstimate = estimatedLines(meaningfulFiles, policy.estimatedLinesPerFile);
  const lineEstimate = actualLines > 0 ? actualLines : fileEstimate;
  const checks = checkScore(batch.checks);
  const reviews = reviewScore(batch.reviews, policy.requiredPasses);

  return {
    repository: batch.repository,
    branch: batch.branch,
    headSha: batch.headSha,
    author: batch.author,
    forced: batch.forced,
    submittedAt: batch.submittedAt,
    productionBranch: isProductionBranch(batch.branch, policy),
    totalFiles: batch.files.length,
    meaningfulFiles: meaningfulFiles.length,
    ignoredFiles: ignoredFiles.length,
    addedFiles: meaningfulFiles.filter((file) => file.status === "added").length,
    modifiedFiles: meaningfulFiles.filter((file) => file.status === "modified").length,
    removedFiles: meaningfulFiles.filter((file) => file.status === "removed").length,
    actualLines,
    lineEstimate,
    substantial: lineEstimate >= policy.substantialLineThreshold,
    checks,
    reviews,
    files: meaningfulFiles,
    ignored: ignoredFiles,
  };
}

export function summarizeFiles(files) {
  const byStatus = { added: 0, modified: 0, removed: 0, renamed: 0 };
  const extensions = new Map();
  for (const file of files) {
    byStatus[file.status] = (byStatus[file.status] ?? 0) + 1;
    const match = /\.([^.\\/]+)$/.exec(file.path);
    const extension = match ? match[1].toLowerCase() : "(none)";
    extensions.set(extension, (extensions.get(extension) ?? 0) + 1);
  }
  return {
    byStatus,
    byExtension: Object.fromEntries([...extensions.entries()].sort(([a], [b]) => a.localeCompare(b))),
  };
}

export function hasOnlyIgnoredFiles(input, policy = DEFAULT_POLICY) {
  const batch = normalizeChangeBatch(input);
  return batch.files.length > 0 && batch.files.every((file) => isIgnoredPath(file.path, policy));
}
