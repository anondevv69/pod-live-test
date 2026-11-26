function delta(before, after) {
  return after - before;
}

function trend(value) {
  if (value > 0) return "increased";
  if (value < 0) return "decreased";
  return "unchanged";
}

export function compareAnalyses(before, after) {
  const filesDelta = delta(before.meaningfulFiles, after.meaningfulFiles);
  const linesDelta = delta(before.lineEstimate, after.lineEstimate);
  const checksDelta = delta(before.checks.score, after.checks.score);
  const passesDelta = delta(before.reviews.passCount, after.reviews.passCount);
  return {
    repository: after.repository,
    beforeSha: before.headSha,
    afterSha: after.headSha,
    meaningfulFiles: { before: before.meaningfulFiles, after: after.meaningfulFiles, delta: filesDelta, trend: trend(filesDelta) },
    estimatedLines: { before: before.lineEstimate, after: after.lineEstimate, delta: linesDelta, trend: trend(linesDelta) },
    checkScore: { before: before.checks.score, after: after.checks.score, delta: checksDelta, trend: trend(checksDelta) },
    reviewPasses: { before: before.reviews.passCount, after: after.reviews.passCount, delta: passesDelta, trend: trend(passesDelta) },
    substantial: { before: before.substantial, after: after.substantial },
  };
}

export function compareDecisions(before, after) {
  const analysis = compareAnalyses(before.analysis, after.analysis);
  return {
    ...analysis,
    status: { before: before.status, after: after.status },
    score: {
      before: before.score,
      after: after.score,
      delta: delta(before.score, after.score),
      trend: trend(delta(before.score, after.score)),
    },
    counted: { before: before.counted, after: after.counted },
    countPath: { before: before.countPath ?? null, after: after.countPath ?? null },
  };
}

export function strongestDecision(decisions) {
  if (decisions.length === 0) return null;
  return [...decisions].sort((a, b) => b.score - a.score)[0];
}

export function weakestDecision(decisions) {
  if (decisions.length === 0) return null;
  return [...decisions].sort((a, b) => a.score - b.score)[0];
}
