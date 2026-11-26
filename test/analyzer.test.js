import assert from "node:assert/strict";
import test from "node:test";
import { analyzeChangeBatch, hasOnlyIgnoredFiles, summarizeFiles } from "../src/index.js";

const sha = "a".repeat(40);

function batch(overrides = {}) {
  return {
    repository: "anondevv69/pod-live-test",
    branch: "main",
    headSha: sha,
    author: "anondevv69",
    submittedAt: "2026-11-26T21:00:00.000Z",
    files: [
      { path: "src/feature.js", status: "added", additions: 42, deletions: 0 },
      { path: "test/feature.test.js", status: "added", additions: 24, deletions: 0 },
      { path: "README.md", status: "modified", additions: 3, deletions: 1 },
    ],
    checks: [{ name: "unit", passed: true }],
    reviews: [],
    ...overrides,
  };
}

test("analyzer separates meaningful code from ignored documentation", () => {
  const analysis = analyzeChangeBatch(batch());
  assert.equal(analysis.meaningfulFiles, 2);
  assert.equal(analysis.ignoredFiles, 1);
  assert.equal(analysis.actualLines, 66);
  assert.equal(analysis.lineEstimate, 66);
  assert.equal(analysis.substantial, true);
});

test("analyzer falls back to a per-file estimate when diff stats are absent", () => {
  const analysis = analyzeChangeBatch(batch({
    files: [{ path: "src/small.js", status: "modified", additions: 0, deletions: 0 }],
  }));
  assert.equal(analysis.lineEstimate, 5);
});

test("file summaries group status and extension", () => {
  const summary = summarizeFiles([
    { path: "src/a.js", status: "added", additions: 1, deletions: 0 },
    { path: "src/b.js", status: "modified", additions: 1, deletions: 0 },
    { path: "src/c.ts", status: "removed", additions: 0, deletions: 1 },
  ]);
  assert.deepEqual(summary.byStatus, { added: 1, modified: 1, removed: 1, renamed: 0 });
  assert.deepEqual(summary.byExtension, { js: 2, ts: 1 });
});

test("ignored-only helper recognizes docs and workflow-only changes", () => {
  assert.equal(hasOnlyIgnoredFiles(batch({
    files: [
      { path: "README.md", status: "modified", additions: 8, deletions: 0 },
      { path: ".github/workflows/test.yml", status: "modified", additions: 8, deletions: 0 },
    ],
  })), true);
});
