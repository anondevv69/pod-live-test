import {
  assert,
  assertArray,
  assertBoolean,
  assertNonEmptyString,
  assertNonNegativeNumber,
  assertPlainObject,
} from "./errors.js";

const SHA_PATTERN = /^[0-9a-f]{40}$/i;
const REPO_PATTERN = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;

export function normalizeSha(value, label = "headSha") {
  const sha = assertNonEmptyString(value, label).toLowerCase();
  assert(SHA_PATTERN.test(sha), `${label} must be a 40-character hexadecimal SHA`, "INVALID_SHA");
  return sha;
}

export function normalizeRepo(value, label = "repository") {
  const repo = assertNonEmptyString(value, label);
  assert(REPO_PATTERN.test(repo), `${label} must be shaped as owner/name`, "INVALID_REPO");
  return repo;
}

export function normalizeFileChange(change, index = 0) {
  assertPlainObject(change, `files[${index}]`);
  const path = assertNonEmptyString(change.path, `files[${index}].path`);
  const status = change.status ?? "modified";
  assert(
    ["added", "modified", "removed", "renamed"].includes(status),
    `files[${index}].status is not supported`,
    "INVALID_FILE_STATUS",
  );
  return {
    path,
    status,
    additions: assertNonNegativeNumber(change.additions ?? 0, `files[${index}].additions`),
    deletions: assertNonNegativeNumber(change.deletions ?? 0, `files[${index}].deletions`),
  };
}

export function normalizeCheck(check, index = 0) {
  assertPlainObject(check, `checks[${index}]`);
  return {
    name: assertNonEmptyString(check.name, `checks[${index}].name`),
    passed: assertBoolean(check.passed, `checks[${index}].passed`),
    required: check.required === undefined ? true : assertBoolean(check.required, `checks[${index}].required`),
  };
}

export function normalizeReview(review, index = 0) {
  assertPlainObject(review, `reviews[${index}]`);
  const verdict = assertNonEmptyString(review.verdict, `reviews[${index}].verdict`).toLowerCase();
  assert(["pass", "fail"].includes(verdict), `reviews[${index}].verdict must be pass or fail`, "INVALID_VERDICT");
  return {
    reviewer: assertNonEmptyString(review.reviewer, `reviews[${index}].reviewer`),
    verdict,
    independent: review.independent === undefined
      ? true
      : assertBoolean(review.independent, `reviews[${index}].independent`),
    submittedAt: review.submittedAt ?? null,
  };
}

export function normalizeChangeBatch(input) {
  assertPlainObject(input, "change batch");
  const files = assertArray(input.files ?? [], "files").map(normalizeFileChange);
  const checks = assertArray(input.checks ?? [], "checks").map(normalizeCheck);
  const reviews = assertArray(input.reviews ?? [], "reviews").map(normalizeReview);
  return {
    repository: normalizeRepo(input.repository),
    branch: assertNonEmptyString(input.branch ?? "main", "branch"),
    headSha: normalizeSha(input.headSha),
    author: assertNonEmptyString(input.author, "author"),
    forced: input.forced === undefined ? false : assertBoolean(input.forced, "forced"),
    submittedAt: input.submittedAt ?? null,
    files,
    checks,
    reviews,
  };
}

export function validatePolicy(policy) {
  assertPlainObject(policy, "policy");
  assertNonNegativeNumber(policy.minimumLines, "policy.minimumLines");
  assertNonNegativeNumber(policy.reviewWindowHours, "policy.reviewWindowHours");
  assertNonNegativeNumber(policy.requiredPasses, "policy.requiredPasses");
  assertNonNegativeNumber(policy.maximumPerDay, "policy.maximumPerDay");
  assertNonNegativeNumber(policy.cooldownMinutes, "policy.cooldownMinutes");
  assertNonNegativeNumber(policy.substantialLineThreshold, "policy.substantialLineThreshold");
  return policy;
}
