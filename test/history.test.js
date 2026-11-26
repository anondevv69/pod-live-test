import assert from "node:assert/strict";
import test from "node:test";
import { PushHistory, mergeHistories } from "../src/index.js";

const repo = "anondevv69/pod-live-test";
const shaA = "c".repeat(40);
const shaB = "d".repeat(40);

test("history records each repository SHA only once", () => {
  const history = new PushHistory();
  assert.equal(history.record({ repository: repo, headSha: shaA, timestamp: "2026-11-26T10:00:00.000Z" }).recorded, true);
  assert.equal(history.record({ repository: repo, headSha: shaA, timestamp: "2026-11-26T10:01:00.000Z" }).duplicate, true);
  assert.equal(history.size, 1);
  assert.equal(history.hasSeen(repo, shaA), true);
});

test("history reports daily counts and the last counted push", () => {
  const history = new PushHistory([
    { repository: repo, headSha: shaA, timestamp: "2026-11-26T10:00:00.000Z" },
    { repository: repo, headSha: shaB, timestamp: "2026-11-26T12:00:00.000Z" },
  ]);
  assert.equal(history.countedOnDay(repo, "2026-11-26T23:00:00.000Z"), 2);
  assert.equal(history.lastCounted(repo).headSha, shaB);
});

test("histories can be merged without duplicating entries", () => {
  const one = new PushHistory([{ repository: repo, headSha: shaA, timestamp: "2026-11-26T10:00:00.000Z" }]);
  const two = new PushHistory([
    { repository: repo, headSha: shaA, timestamp: "2026-11-26T10:00:00.000Z" },
    { repository: repo, headSha: shaB, timestamp: "2026-11-26T11:00:00.000Z" },
  ]);
  assert.equal(mergeHistories(one, two).size, 2);
});
