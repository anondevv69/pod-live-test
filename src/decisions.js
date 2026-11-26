import { analyzeChangeBatch } from "./analyzer.js";
import { DEFAULT_POLICY } from "./policy.js";
import { assessRisk } from "./risk.js";
import { readinessScore, scoreBand, substanceScore } from "./scoring.js";
import { cooldownState, windowState } from "./time.js";

function rejection(code, reason, analysis, extras = {}) {
  return {
    status: "rejected",
    counted: false,
    code,
    reasons: [reason],
    analysis,
    ...extras,
  };
}

export function evaluateChangeBatch(input, options = {}) {
  const policy = options.policy ?? DEFAULT_POLICY;
  const analysis = analyzeChangeBatch(input, policy);
  const substance = substanceScore(analysis, policy.minimumLines);
  const score = readinessScore({ substance, checks: analysis.checks, reviews: analysis.reviews });
  const band = scoreBand(score);
  const risk = assessRisk(analysis, {
    duplicate: Boolean(options.duplicate),
    countedToday: options.countedToday ?? 0,
    lastCountedAt: options.lastCountedAt ?? null,
    now: options.now ?? Date.now(),
  }, policy);

  if (!analysis.productionBranch) {
    return rejection("NON_PRODUCTION_BRANCH", `Branch ${analysis.branch} is not a production branch`, analysis, { score, band, risk });
  }
  if (analysis.forced) {
    return rejection("FORCE_PUSH", "Force pushes never count", analysis, { score, band, risk });
  }
  if (analysis.meaningfulFiles === 0) {
    return rejection("NO_MEANINGFUL_FILES", "Only ignored files changed", analysis, { score, band, risk });
  }
  if (analysis.lineEstimate < policy.minimumLines) {
    return rejection("INSUFFICIENT_CHANGE", "The change is below the minimum line threshold", analysis, { score, band, risk });
  }
  if (!analysis.checks.complete) {
    return rejection("CHECKS_INCOMPLETE", "Required checks have not all passed", analysis, { score, band, risk });
  }
  if (options.duplicate) {
    return rejection("DUPLICATE_PUSH", "This head SHA has already been counted", analysis, { score, band, risk });
  }
  if ((options.countedToday ?? 0) >= policy.maximumPerDay) {
    return rejection("DAILY_CAP", "The daily counted-push cap has been reached", analysis, { score, band, risk });
  }

  const cooldown = cooldownState(
    options.lastCountedAt ?? null,
    policy.cooldownMinutes,
    analysis.lineEstimate,
    policy.substantialLineThreshold,
    options.now ?? Date.now(),
  );
  if (cooldown.blocked) {
    return rejection("COOLDOWN", "The previous counted push is still inside the cooldown", analysis, {
      score,
      band,
      risk,
      cooldown,
    });
  }
  if (analysis.reviews.vetoed) {
    return rejection("REVIEW_VETO", "An independent reviewer vetoed this push", analysis, { score, band, risk, cooldown });
  }

  const window = windowState(analysis.submittedAt ?? options.now ?? Date.now(), policy.reviewWindowHours, options.now ?? Date.now());
  if (analysis.reviews.quorumMet) {
    return {
      status: "counted",
      counted: true,
      countPath: "swarm",
      reasons: ["Verifier passed and independent review quorum was reached"],
      analysis,
      score,
      band,
      risk,
      cooldown,
      window,
    };
  }
  if (window.state === "expired") {
    return {
      status: "counted",
      counted: true,
      countPath: "verifier-fallback",
      reasons: ["Verifier passed and the review window expired without a veto"],
      analysis,
      score,
      band,
      risk,
      cooldown,
      window,
    };
  }
  return {
    status: "pending-review",
    counted: false,
    countPath: null,
    reasons: ["Verifier passed; the mandatory review window is still open"],
    analysis,
    score,
    band,
    risk,
    cooldown,
    window,
  };
}

export function decisionLabel(decision) {
  if (decision.status === "counted") return `counted via ${decision.countPath}`;
  if (decision.status === "pending-review") return "pending review";
  return `rejected: ${decision.code}`;
}
