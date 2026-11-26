export class ShipWindowError extends Error {
  constructor(message, code = "SHIP_WINDOW_ERROR", details = undefined) {
    super(message);
    this.name = "ShipWindowError";
    this.code = code;
    this.details = details;
  }
}

export function fail(message, code, details) {
  throw new ShipWindowError(message, code, details);
}

export function assert(condition, message, code = "ASSERTION_FAILED", details = undefined) {
  if (!condition) {
    fail(message, code, details);
  }
  return true;
}

export function assertPlainObject(value, label) {
  assert(
    value !== null && typeof value === "object" && !Array.isArray(value),
    `${label} must be an object`,
    "INVALID_TYPE",
    { label, received: typeof value },
  );
  return value;
}

export function assertArray(value, label) {
  assert(Array.isArray(value), `${label} must be an array`, "INVALID_TYPE", {
    label,
    received: typeof value,
  });
  return value;
}

export function assertNonEmptyString(value, label) {
  assert(
    typeof value === "string" && value.trim().length > 0,
    `${label} must be a non-empty string`,
    "INVALID_STRING",
    { label },
  );
  return value.trim();
}

export function assertFiniteNumber(value, label) {
  assert(
    typeof value === "number" && Number.isFinite(value),
    `${label} must be a finite number`,
    "INVALID_NUMBER",
    { label },
  );
  return value;
}

export function assertNonNegativeNumber(value, label) {
  assertFiniteNumber(value, label);
  assert(value >= 0, `${label} must not be negative`, "INVALID_NUMBER", { label, value });
  return value;
}

export function assertBoolean(value, label) {
  assert(typeof value === "boolean", `${label} must be a boolean`, "INVALID_TYPE", { label });
  return value;
}
