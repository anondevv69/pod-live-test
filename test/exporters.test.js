import assert from "node:assert/strict";
import test from "node:test";
import { decisionsToCsv, decisionsToJsonLines, decisionsToMarkdown, evaluateChangeBatch } from "../src/index.js";

const decision = evaluateChangeBatch({
  repository: "anondevv69/pod-live-test",
  branch: "main",
  headSha: "f".repeat(40),
  author: "builder",
  submittedAt: "2026-11-26T10:00:00.000Z",
  files: [{ path: "src/export.js", status: "added", additions: 60, deletions: 0 }],
  checks: [{ name: "tests", passed: true }],
  reviews: [
    { reviewer: "one", verdict: "pass", independent: true },
    { reviewer: "two", verdict: "pass", independent: true },
  ],
}, { now: "2026-11-26T10:05:00.000Z" });

test("CSV export includes headers and the decision row", () => {
  const csv = decisionsToCsv([decision]);
  assert.match(csv, /^repository,headSha,status/);
  assert.match(csv, /counted/);
  assert.match(csv, /verifier|swarm/);
});

test("Markdown and JSONL exports are line-oriented", () => {
  const markdown = decisionsToMarkdown([decision]);
  assert.match(markdown, /\| Repository \| Commit \| Status \|/);
  assert.match(markdown, /fffffff/);
  const parsed = JSON.parse(decisionsToJsonLines([decision]));
  assert.equal(parsed.repository, "anondevv69/pod-live-test");
  assert.equal(parsed.counted, true);
});
