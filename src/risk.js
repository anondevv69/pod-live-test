import { DEFAULT_POLICY } from "./policy.js";
import { cooldownState } from "./time.js";

function flag(code, severity, message) {
  return { code, severity, message };
}

export function assessRisk(analysis, context = {}, policy = DEFAULT_POLICY) {
  const flags = [];
  if (!analysis.productionBranch) {
    flags.push(flag("NON_PRODUCTION_BRANCH", "blocked", "The target branch is not a production branch"));
  }
  if (analysis.forced) {
    flags.push(flag("FORCE_PUSH", "blocked", "Force pushes cannot be trusted as additive history"));
  }
  if (analysis.meaningfulFiles === 0) {
    flags.push(flag("NO_MEANINGFUL_FILES", "blocked", "The push changes no meaningful files"));
  }
  if (analysis.lineEstimate < policy.minimumLines) {
    flags.push(flag("BELOW_MINIMUM", "blocked", "The estimated change is below the policy minimum"));
  }
  if (!analysis.checks.complete) {
    flags.push(flag("CHECKS_INCOMPLETE", "blocked", "At least one required check has not passed"));
  }
  if (analysis.reviews.vetoed) {
    flags.push(flag("REVIEW_VETO", "blocked", "An independent reviewer vetoed the push"));
  }
  if (context.duplicate) {
    flags.push(flag("DUPLICATE_PUSH", "blocked", "The head SHA is already present in the history"));
  }
  if ((context.countedToday ?? 0) >= policy.maximumPerDay) {
    flags.push(flag("DAILY_CAP", "blocked", "The repository has reached its daily counted-push cap"));
  }
  if (!analysis.substantial) {
    flags.push(flag("SMALL_CHANGE", "warning", "The change does not meet the substantial-change threshold"));
  }
  if (analysis.reviews.passCount > 0 && !analysis.reviews.quorumMet) {
    flags.push(flag("PARTIAL_REVIEW", "warning", "Review has started but quorum has not been reached"));
  }

  const cooldown = cooldownState(
    context.lastCountedAt ?? null,
    policy.cooldownMinutes,
    analysis.lineEstimate,
    policy.substantialLineThreshold,
    context.now ?? Date.now(),
  );
  if (cooldown.blocked) {
    flags.push(flag("COOLDOWN", "blocked", "The previous counted push is still inside the cooldown"));
  }

  const blocked = flags.some((item) => item.severity === "blocked");
  const warnings = flags.filter((item) => item.severity === "warning").length;
  return {
    level: blocked ? "blocked" : warnings > 0 ? "watch" : "clear",
    blocked,
    warningCount: warnings,
    flags,
    cooldown,
    score: Math.max(0, 100 - flags.filter((item) => item.severity === "blocked").length * 30 - warnings * 8),
  };
}

export function riskCodes(risk) {
  return risk.flags.map((item) => item.code);
}

export function hasRisk(risk, code) {
  return risk.flags.some((item) => item.code === code);
}
