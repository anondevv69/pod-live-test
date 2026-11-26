import assert from "node:assert/strict";
import test from "node:test";
import { analyzeChangeBatch, assessRisk, hasRisk } from "../src/index.js";

const base = {
  repository: "anondevv69/pod-live-test",
  branch: "main",
  headSha: "1".repeat(40),
  author: "builder",
  submittedAt: "2026-11-26T10:00:00.000Z",
  files: [{ path: "src/risk.js", status: "added", additions: 75, deletions: 0 }],
  checks: [{ name: "tests", passed: true }],
  reviews: [],
};

test("risk assessment is clear for a substantial passing change", () => {
  const risk = assessRisk(analyzeChangeBatch(base), { now: "2026-11-26T10:00:00.000Z" });
  assert.equal(risk.level, "clear");
  assert.equal(risk.blocked, false);
});

test("risk assessment blocks duplicates and incomplete checks", () => {
  const analysis = analyzeChangeBatch({
    ...base,
    checks: [{ name: "tests", passed: false }],
  });
  const risk = assessRisk(analysis, { duplicate: true, now: "2026-11-26T10:00:00.000Z" });
  assert.equal(risk.level, "blocked");
  assert.equal(hasRisk(risk, "DUPLICATE_PUSH"), true);
  assert.equal(hasRisk(risk, "CHECKS_INCOMPLETE"), true);
});
