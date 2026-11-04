import { performance } from 'node:perf_hooks';
import type { RunSummary, RunTerminalReason } from '../shared/run-budget.js';

export interface BudgetClock {
  now(): number;
  wallNow(): number;
  setTimeout(callback: () => void, ms: number): unknown;
  clearTimeout(handle: unknown): void;
}
const defaultBudgetClock: BudgetClock = {
  now: () => performance.now(), wallNow: () => Date.now(),
  setTimeout: (callback, ms) => setTimeout(callback, ms),
  clearTimeout: handle => clearTimeout(handle as ReturnType<typeof setTimeout>)
};
export class RunBudgetExceededError extends Error {
  constructor(minutes: number) {
    super(`Build time budget exhausted (${minutes} minutes). Model work has stopped. Artifacts and available usage are saved. Start a new build to use a new budget.`);
    this.name = 'RunBudgetExceededError';
  }
}
export function runAbortError(signal: AbortSignal): Error {
  return signal.reason instanceof RunBudgetExceededError ? signal.reason : new Error('Run stopped by you. Source and session logs are saved.');
}

/** One immutable, monotonic deadline. All work shares it, including setup and host checks. */
export class RunBudget {
  private readonly began: number;
  private readonly consumed: number;
  private readonly timer: unknown;
  private phaseBegan: number;
  private phaseConsumed = 0;
  private closed = false;
  private readonly limitMs: number;
  constructor(private readonly summary: RunSummary, private readonly controller: AbortController, private readonly clock: BudgetClock = defaultBudgetClock) {
    if (!Number.isSafeInteger(summary.timeLimitMs) || summary.timeLimitMs <= 0) throw new Error('Invalid build time budget.');
    this.limitMs = summary.timeLimitMs;
    this.began = clock.now();
    this.consumed = Math.max(0, summary.elapsedMs);
    this.phaseBegan = this.began;
    this.phaseConsumed = summary.phases.at(-1)?.finishedAt ? 0 : summary.phases.at(-1)?.durationMs ?? 0;
    // When rehydrating an existing allowance, downtime cannot create new time.
    const wallRemaining = Date.parse(summary.deadlineAt) - clock.wallNow();
    this.consumed = Math.max(this.consumed, Number.isFinite(wallRemaining) ? this.limitMs - wallRemaining : 0);
    const remaining = Math.max(0, this.limitMs - this.consumed);
    this.timer = clock.setTimeout(() => this.exhaust(), remaining);
    if (!remaining) this.exhaust();
  }
  private exhaust() {
    if (!this.closed && !this.controller.signal.aborted) this.controller.abort(new RunBudgetExceededError(this.limitMs / 60_000));
  }
  check() {
    if (!this.closed && this.elapsed() >= this.limitMs) this.exhaust();
    if (this.controller.signal.aborted) throw runAbortError(this.controller.signal);
    if (this.closed) throw new Error('Build budget is closed.');
  }
  private elapsed() { return this.closed ? this.summary.elapsedMs : Math.max(this.summary.elapsedMs, this.consumed + Math.max(0, this.clock.now() - this.began)); }
  remainingMs() { this.check(); return Math.max(0, this.limitMs - this.elapsed()); }
  async wait<T>(operation: () => Promise<T>): Promise<T> {
    this.check();
    const signal = this.controller.signal;
    let abort!: () => void;
    const interrupted = new Promise<never>((_, reject) => { abort = () => reject(runAbortError(signal)); });
    signal.addEventListener('abort', abort, { once: true });
    try {
      this.check();
      const result = await Promise.race([operation(), interrupted]);
      this.check();
      return result;
    } finally { signal.removeEventListener('abort', abort); }
  }
  phase(id: string, label: string) {
    this.check(); this.snapshot();
    const previous = this.summary.phases.at(-1);
    if (previous && !previous.finishedAt) previous.finishedAt = new Date(this.clock.wallNow()).toISOString();
    this.summary.phases.push({ id, label, startedAt: new Date(this.clock.wallNow()).toISOString(), durationMs: 0 });
    this.phaseBegan = this.clock.now(); this.phaseConsumed = 0;
  }
  snapshot() {
    if (!this.closed) {
      this.summary.elapsedMs = Math.round(this.elapsed());
      const phase = this.summary.phases.at(-1);
      if (phase && !phase.finishedAt) phase.durationMs = Math.round(this.phaseConsumed + Math.max(0, this.clock.now() - this.phaseBegan));
    }
    return this.summary;
  }
  finish(reason: RunTerminalReason) {
    if (this.closed) return this.summary;
    this.snapshot(); this.closed = true; this.clock.clearTimeout(this.timer);
    this.summary.finishedAt = new Date(this.clock.wallNow()).toISOString();
    this.summary.terminalReason = this.controller.signal.reason instanceof RunBudgetExceededError ? 'time_budget_exhausted' : reason;
    const phase = this.summary.phases.at(-1);
    if (phase && !phase.finishedAt) phase.finishedAt = this.summary.finishedAt;
    return this.summary;
  }
}
