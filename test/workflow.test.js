import assert from "node:assert/strict";
import test from "node:test";
import { ReviewWorkflow } from "../src/index.js";

const sha = "e".repeat(40);
const opened = "2026-11-26T10:00:00.000Z";

function batch() {
  return {
    repository: "anondevv69/pod-live-test",
    branch: "main",
    headSha: sha,
    author: "builder",
    submittedAt: opened,
    files: [{ path: "src/workflow.js", status: "added", additions: 80, deletions: 0 }],
    checks: [{ name: "tests", passed: true }],
    reviews: [],
  };
}

test("workflow holds a passing push and settles it after window expiry", () => {
  const workflow = new ReviewWorkflow({ amountPerCountedPush: 150 });
  const pending = workflow.submit(batch(), { now: opened });
  assert.equal(pending.status, "pending-review");
  assert.equal(workflow.pending().length, 1);
  assert.equal(workflow.snapshot().totals.counted, 0);

  const settled = workflow.settleExpired("2026-11-26T16:00:00.000Z");
  assert.equal(settled.length, 1);
  assert.equal(settled[0].status, "counted");
  assert.equal(settled[0].countPath, "verifier-fallback");
  const snapshot = workflow.snapshot();
  assert.equal(snapshot.totals.counted, 1);
  assert.equal(snapshot.totals.amount, 150);
  assert.equal(snapshot.pending.length, 0);
});

test("workflow rejects a second submission of a counted SHA as duplicate", () => {
  const workflow = new ReviewWorkflow();
  workflow.submit(batch(), { now: opened });
  workflow.settleExpired("2026-11-26T16:00:00.000Z");
  const duplicate = workflow.submit(batch(), { now: "2026-11-26T16:05:00.000Z" });
  assert.equal(duplicate.status, "rejected");
  assert.equal(duplicate.code, "DUPLICATE_PUSH");
});
