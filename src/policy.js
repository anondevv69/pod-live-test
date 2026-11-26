import { validatePolicy } from "./validation.js";

export const DEFAULT_POLICY = Object.freeze({
  productionBranches: Object.freeze(["main", "master", "production", "prod"]),
  minimumLines: 3,
  estimatedLinesPerFile: 5,
  reviewWindowHours: 6,
  requiredPasses: 2,
  maximumPerDay: 3,
  cooldownMinutes: 30,
  substantialLineThreshold: 50,
  ignoredPatterns: Object.freeze([
    /\.md$/i,
    /\.txt$/i,
    /\.lock$/i,
    /package-lock\.json$/,
    /yarn\.lock$/,
    /pnpm-lock\.yaml$/,
    /\.gitignore$/,
    /\.gitattributes$/,
    /CHANGELOG/i,
    /LICENSE/i,
    /NOTICE/i,
    /^\.github\//,
    /^\.claude\//,
  ]),
});

export function createPolicy(overrides = {}) {
  const policy = {
    ...DEFAULT_POLICY,
    ...overrides,
    productionBranches: Object.freeze([
      ...(overrides.productionBranches ?? DEFAULT_POLICY.productionBranches),
    ]),
    ignoredPatterns: Object.freeze([
      ...(overrides.ignoredPatterns ?? DEFAULT_POLICY.ignoredPatterns),
    ]),
  };
  validatePolicy(policy);
  return Object.freeze(policy);
}

export function isProductionBranch(branch, policy = DEFAULT_POLICY) {
  return policy.productionBranches.includes(branch);
}

export function isIgnoredPath(path, policy = DEFAULT_POLICY) {
  return policy.ignoredPatterns.some((pattern) => pattern.test(path));
}

export function policySummary(policy = DEFAULT_POLICY) {
  return {
    productionBranches: [...policy.productionBranches],
    minimumLines: policy.minimumLines,
    reviewWindowHours: policy.reviewWindowHours,
    requiredPasses: policy.requiredPasses,
    maximumPerDay: policy.maximumPerDay,
    cooldownMinutes: policy.cooldownMinutes,
    substantialLineThreshold: policy.substantialLineThreshold,
  };
}
