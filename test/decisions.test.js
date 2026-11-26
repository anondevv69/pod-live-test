import assert from "node:assert/strict";
import test from "node:test";
import { evaluateChangeBatch } from "../src/index.js";

const sha = "b".repeat(40);
const opened = "2026-11-26T15:00:00.000Z";

function batch(overrides = {}) {
  return {
    repository: "anondevv69/pod-live-test",
    branch: "main",
    headSha: sha,
    author: "builder",
    submittedAt: opened,
    files: [{ path: "src/work.js", status: "modified", additions: 35, deletions: 15 }],
    checks: [{ name: "tests", passed: true }],
    reviews: [],
    ...overrides,
  };
}

test("a passing push remains pending while its review window is open", () => {
  const decision = evaluateChangeBatch(batch(), { now: "2026-11-26T16:00:00.000Z" });
  assert.equal(decision.status, "pending-review");
  assert.equal(decision.counted, false);
  assert.equal(decision.window.state, "open");
});

test("two independent passes count immediately through the swarm path", () => {
  const decision = evaluateChangeBatch(batch({
    reviews: [
      { reviewer: "one", verdict: "pass", independent: true },
      { reviewer: "two", verdict: "pass", independent: true },
    ],
  }), { now: "2026-11-26T16:00:00.000Z" });
  assert.equal(decision.status, "counted");
  assert.equal(decision.countPath, "swarm");
});

test("window expiry counts through verifier fallback", () => {
  const decision = evaluateChangeBatch(batch(), { now: "2026-11-26T21:00:01.000Z" });
  assert.equal(decision.status, "counted");
  assert.equal(decision.countPath, "verifier-fallback");
});

test("an independent fail vetoes even when another reviewer passes", () => {
  const decision = evaluateChangeBatch(batch({
    reviews: [
      { reviewer: "one", verdict: "pass", independent: true },
      { reviewer: "two", verdict: "fail", independent: true },
    ],
  }), { now: "2026-11-26T16:00:00.000Z" });
  assert.equal(decision.status, "rejected");
  assert.equal(decision.code, "REVIEW_VETO");
});

test("force pushes and non-production branches are rejected before review", () => {
  assert.equal(evaluateChangeBatch(batch({ forced: true })).code, "FORCE_PUSH");
  assert.equal(evaluateChangeBatch(batch({ branch: "feature" })).code, "NON_PRODUCTION_BRANCH");
});
