import { ShipWindowError } from "./errors.js";

export function toTimestamp(value, label = "timestamp") {
  if (value === null || value === undefined || value === "") {
    throw new ShipWindowError(`${label} is required`, "INVALID_TIMESTAMP");
  }
  const timestamp = value instanceof Date ? value.getTime() : new Date(value).getTime();
  if (!Number.isFinite(timestamp)) {
    throw new ShipWindowError(`${label} must be a valid date or timestamp`, "INVALID_TIMESTAMP", { value });
  }
  return timestamp;
}

export function addHours(timestamp, hours) {
  return toTimestamp(timestamp) + hours * 60 * 60 * 1000;
}

export function addMinutes(timestamp, minutes) {
  return toTimestamp(timestamp) + minutes * 60 * 1000;
}

export function minutesBetween(start, end) {
  return (toTimestamp(end) - toTimestamp(start)) / 60_000;
}

export function hoursBetween(start, end) {
  return minutesBetween(start, end) / 60;
}

export function isExpired(expiresAt, now = Date.now()) {
  return toTimestamp(now) >= toTimestamp(expiresAt);
}

export function windowState(openedAt, windowHours, now = Date.now()) {
  const opened = toTimestamp(openedAt, "openedAt");
  const expires = addHours(opened, windowHours);
  const current = toTimestamp(now, "now");
  if (current < opened) {
    return {
      state: "scheduled",
      openedAt: new Date(opened).toISOString(),
      expiresAt: new Date(expires).toISOString(),
      remainingMs: expires - current,
    };
  }
  if (current < expires) {
    return {
      state: "open",
      openedAt: new Date(opened).toISOString(),
      expiresAt: new Date(expires).toISOString(),
      remainingMs: expires - current,
    };
  }
  return {
    state: "expired",
    openedAt: new Date(opened).toISOString(),
    expiresAt: new Date(expires).toISOString(),
    remainingMs: 0,
  };
}

export function cooldownState(lastCountedAt, cooldownMinutes, lineEstimate, substantialLineThreshold, now = Date.now()) {
  if (!lastCountedAt) {
    return { blocked: false, bypassed: false, reason: "No previous counted push" };
  }
  const elapsed = minutesBetween(lastCountedAt, now);
  if (elapsed >= cooldownMinutes) {
    return { blocked: false, bypassed: false, reason: "Cooldown has elapsed", elapsedMinutes: elapsed };
  }
  if (lineEstimate >= substantialLineThreshold) {
    return {
      blocked: false,
      bypassed: true,
      reason: "Substantial change bypasses the cooldown",
      elapsedMinutes: elapsed,
    };
  }
  return {
    blocked: true,
    bypassed: false,
    reason: "Cooldown is still active",
    elapsedMinutes: elapsed,
    remainingMinutes: cooldownMinutes - elapsed,
  };
}
