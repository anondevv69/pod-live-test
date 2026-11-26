function clamp(value, minimum = 0, maximum = 100) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function changedLines(files) {
  return files.reduce((total, file) => total + file.additions + file.deletions, 0);
}

export function estimatedLines(files, linesPerFile = 5) {
  return files.length * linesPerFile;
}

export function checkScore(checks) {
  const required = checks.filter((check) => check.required);
  if (required.length === 0) {
    return { required: 0, passed: 0, failed: 0, score: 0, complete: false };
  }
  const passed = required.filter((check) => check.passed).length;
  return {
    required: required.length,
    passed,
    failed: required.length - passed,
    score: Math.round((passed / required.length) * 100),
    complete: passed === required.length,
  };
}

export function reviewScore(reviews, requiredPasses) {
  const independent = reviews.filter((review) => review.independent);
  const passes = independent.filter((review) => review.verdict === "pass");
  const failures = independent.filter((review) => review.verdict === "fail");
  const uniquePassReviewers = new Set(passes.map((review) => review.reviewer.toLowerCase()));
  return {
    independentReviews: independent.length,
    passCount: uniquePassReviewers.size,
    failCount: failures.length,
    requiredPasses,
    quorumMet: uniquePassReviewers.size >= requiredPasses,
    vetoed: failures.length > 0,
  };
}

export function substanceScore(analysis, minimumLines) {
  if (analysis.meaningfulFiles === 0) return 0;
  const lineComponent = clamp((analysis.lineEstimate / Math.max(minimumLines, 1)) * 20, 0, 60);
  const fileComponent = clamp(analysis.meaningfulFiles * 5, 0, 25);
  const breadthComponent = analysis.removedFiles > 0 ? 5 : 10;
  return Math.round(clamp(lineComponent + fileComponent + breadthComponent));
}

export function readinessScore({ substance, checks, reviews }) {
  const reviewComponent = reviews.vetoed ? 0 : reviews.quorumMet ? 20 : reviews.passCount * 7;
  return Math.round(clamp(substance * 0.55 + checks.score * 0.25 + reviewComponent));
}

export function scoreBand(score) {
  if (score >= 85) return "strong";
  if (score >= 65) return "ready";
  if (score >= 40) return "developing";
  return "insufficient";
}
