import assert from "node:assert/strict";
import test from "node:test";
import { cooldownState, windowState } from "../src/index.js";

test("window state reports open and expired windows", () => {
  const opened = "2026-11-26T12:00:00.000Z";
  assert.equal(windowState(opened, 6, "2026-11-26T13:00:00.000Z").state, "open");
  const expired = windowState(opened, 6, "2026-11-26T18:00:00.000Z");
  assert.equal(expired.state, "expired");
  assert.equal(expired.remainingMs, 0);
});

test("substantial changes bypass cooldown while small changes wait", () => {
  const last = "2026-11-26T12:00:00.000Z";
  const now = "2026-11-26T12:10:00.000Z";
  assert.equal(cooldownState(last, 30, 65, 50, now).bypassed, true);
  const blocked = cooldownState(last, 30, 20, 50, now);
  assert.equal(blocked.blocked, true);
  assert.equal(Math.round(blocked.remainingMinutes), 20);
});
