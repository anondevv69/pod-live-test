import { toTimestamp } from "./time.js";
import { normalizeRepo, normalizeSha } from "./validation.js";

function ledgerKey(repository, headSha) {
  return `${repository.toLowerCase()}:${headSha.toLowerCase()}`;
}

export class SettlementLedger {
  #records = new Map();

  record(decision, options = {}) {
    if (!decision?.counted) {
      return { recorded: false, reason: "Decision has not counted" };
    }
    const analysis = decision.analysis;
    const repository = normalizeRepo(analysis.repository);
    const headSha = normalizeSha(analysis.headSha);
    const key = ledgerKey(repository, headSha);
    if (this.#records.has(key)) {
      return { recorded: false, reason: "Push is already in the ledger", record: this.#records.get(key) };
    }
    const recordedAt = options.recordedAt ?? Date.now();
    const record = {
      repository,
      headSha,
      countPath: decision.countPath,
      amount: options.amount ?? null,
      score: decision.score,
      recordedAt: new Date(toTimestamp(recordedAt, "recordedAt")).toISOString(),
    };
    this.#records.set(key, record);
    return { recorded: true, record };
  }

  has(repository, headSha) {
    return this.#records.has(ledgerKey(repository, headSha));
  }

  get(repository, headSha) {
    return this.#records.get(ledgerKey(repository, headSha)) ?? null;
  }

  list(repository = null) {
    const records = [...this.#records.values()];
    return repository
      ? records.filter((record) => record.repository.toLowerCase() === repository.toLowerCase())
      : records;
  }

  totalCounted(repository = null) {
    return this.list(repository).length;
  }

  totalAmount(repository = null) {
    return this.list(repository).reduce((sum, record) => sum + (record.amount ?? 0), 0);
  }

  byCountPath(repository = null) {
    const totals = { swarm: 0, "verifier-fallback": 0, unknown: 0 };
    for (const record of this.list(repository)) {
      if (record.countPath === "swarm") totals.swarm += 1;
      else if (record.countPath === "verifier-fallback") totals["verifier-fallback"] += 1;
      else totals.unknown += 1;
    }
    return totals;
  }

  get size() {
    return this.#records.size;
  }
}
