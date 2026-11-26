import { toTimestamp } from "./time.js";
import { normalizeRepo, normalizeSha } from "./validation.js";

function historyKey(repository, headSha) {
  return `${repository.toLowerCase()}:${headSha.toLowerCase()}`;
}

function dayKey(timestamp) {
  return new Date(toTimestamp(timestamp)).toISOString().slice(0, 10);
}

export function normalizeHistoryEntry(entry) {
  if (!entry || typeof entry !== "object") {
    throw new TypeError("history entry must be an object");
  }
  const timestamp = toTimestamp(entry.timestamp ?? entry.countedAt ?? entry.submittedAt, "history timestamp");
  return {
    repository: normalizeRepo(entry.repository),
    headSha: normalizeSha(entry.headSha),
    counted: entry.counted !== false,
    timestamp: new Date(timestamp).toISOString(),
    countPath: entry.countPath ?? null,
  };
}

export class PushHistory {
  #entries = new Map();

  constructor(entries = []) {
    for (const entry of entries) {
      this.record(entry);
    }
  }

  record(entry) {
    const normalized = normalizeHistoryEntry(entry);
    const key = historyKey(normalized.repository, normalized.headSha);
    if (this.#entries.has(key)) {
      return { recorded: false, duplicate: true, entry: this.#entries.get(key) };
    }
    this.#entries.set(key, normalized);
    return { recorded: true, duplicate: false, entry: normalized };
  }

  hasSeen(repository, headSha) {
    return this.#entries.has(historyKey(repository, headSha));
  }

  get(repository, headSha) {
    return this.#entries.get(historyKey(repository, headSha)) ?? null;
  }

  list(repository = null) {
    const entries = [...this.#entries.values()];
    const filtered = repository
      ? entries.filter((entry) => entry.repository.toLowerCase() === repository.toLowerCase())
      : entries;
    return filtered.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  }

  counted(repository = null) {
    return this.list(repository).filter((entry) => entry.counted);
  }

  lastCounted(repository) {
    const entries = this.counted(repository);
    return entries.length > 0 ? entries[entries.length - 1] : null;
  }

  countedOnDay(repository, date = new Date()) {
    const wanted = date instanceof Date ? date.toISOString().slice(0, 10) : dayKey(date);
    return this.counted(repository).filter((entry) => entry.timestamp.slice(0, 10) === wanted).length;
  }

  clear() {
    this.#entries.clear();
  }

  get size() {
    return this.#entries.size;
  }
}

export function mergeHistories(...histories) {
  const merged = new PushHistory();
  for (const history of histories) {
    const entries = history instanceof PushHistory ? history.list() : history;
    for (const entry of entries) merged.record(entry);
  }
  return merged;
}
