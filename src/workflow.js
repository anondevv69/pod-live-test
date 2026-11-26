import { evaluateChangeBatch } from "./decisions.js";
import { PushHistory } from "./history.js";
import { SettlementLedger } from "./ledger.js";
import { DEFAULT_POLICY } from "./policy.js";
import { toTimestamp } from "./time.js";
import { normalizeChangeBatch } from "./validation.js";

function pendingKey(repository, headSha) {
  return `${repository.toLowerCase()}:${headSha.toLowerCase()}`;
}

function dateForContext(batch, now) {
  return new Date(toTimestamp(now ?? batch.submittedAt ?? Date.now(), "workflow time"));
}

export class ReviewWorkflow {
  #pending = new Map();

  constructor(options = {}) {
    this.policy = options.policy ?? DEFAULT_POLICY;
    this.history = options.history ?? new PushHistory();
    this.ledger = options.ledger ?? new SettlementLedger();
    this.amountPerCountedPush = options.amountPerCountedPush ?? null;
  }

  #contextFor(batch, now) {
    const currentDate = dateForContext(batch, now);
    const last = this.history.lastCounted(batch.repository);
    return {
      duplicate: this.history.hasSeen(batch.repository, batch.headSha) || this.ledger.has(batch.repository, batch.headSha),
      countedToday: this.history.countedOnDay(batch.repository, currentDate),
      lastCountedAt: last?.timestamp ?? null,
    };
  }

  #evaluate(batch, now) {
    return evaluateChangeBatch(batch, {
      policy: this.policy,
      now: toTimestamp(now ?? batch.submittedAt ?? Date.now(), "workflow time"),
      ...this.#contextFor(batch, now),
    });
  }

  #finalize(batch, decision, now) {
    this.history.record({
      repository: batch.repository,
      headSha: batch.headSha,
      counted: true,
      timestamp: now ?? batch.submittedAt ?? Date.now(),
      countPath: decision.countPath,
    });
    this.ledger.record(decision, {
      amount: this.amountPerCountedPush,
      recordedAt: now ?? Date.now(),
    });
    this.#pending.delete(pendingKey(batch.repository, batch.headSha));
  }

  submit(input, options = {}) {
    const batch = normalizeChangeBatch(input);
    const key = pendingKey(batch.repository, batch.headSha);
    const decision = this.#evaluate(batch, options.now);
    if (decision.status === "pending-review") {
      this.#pending.set(key, { batch, decision });
    } else if (decision.counted) {
      this.#finalize(batch, decision, options.now ?? batch.submittedAt ?? Date.now());
    } else {
      this.#pending.delete(key);
    }
    return decision;
  }

  settleExpired(now = Date.now()) {
    const outcomes = [];
    for (const { batch } of [...this.#pending.values()]) {
      const decision = this.#evaluate(batch, now);
      if (decision.counted) {
        this.#finalize(batch, decision, now);
      } else if (decision.status !== "pending-review") {
        this.#pending.delete(pendingKey(batch.repository, batch.headSha));
      } else {
        this.#pending.set(pendingKey(batch.repository, batch.headSha), { batch, decision });
      }
      outcomes.push(decision);
    }
    return outcomes;
  }

  pending() {
    return [...this.#pending.values()].map(({ batch, decision }) => ({
      repository: batch.repository,
      headSha: batch.headSha,
      submittedAt: batch.submittedAt,
      window: decision.window,
    }));
  }

  snapshot(repository = null) {
    return {
      pending: this.pending().filter((item) => !repository || item.repository === repository),
      counted: this.history.counted(repository),
      ledger: this.ledger.list(repository),
      totals: {
        counted: this.ledger.totalCounted(repository),
        amount: this.ledger.totalAmount(repository),
        byCountPath: this.ledger.byCountPath(repository),
      },
    };
  }
}

export function processSequence(inputs, options = {}) {
  const workflow = new ReviewWorkflow(options);
  const decisions = inputs.map((input) => workflow.submit(input, options));
  return { workflow, decisions };
}
