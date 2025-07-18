import type { HTTPStatusBucketsType } from "@mateothegreat/ts-kit/http/status";
import { shallowEqual } from "@mateothegreat/ts-kit/objects/shallow-equal";
import { BehaviorSubject, Observable } from "rxjs";
import { distinctUntilChanged } from "rxjs/operators";

/**
 * MetricsSnapshot is a snapshot of the current metrics state.
 */
export interface MetricsSnapshot {
  /**
   * The number of requests made.
   */
  requests: number;

  /**
   * The duration of the requests.
   */
  duration: number;

  /**
   * The number of errors encountered.
   */
  errors: number;

  /**
   * The number of successful requests.
   */
  successful: number;

  /**
   * The current throughput (requests per second).
   */
  throughput: number;

  /**
   * The current latency (average time per request).
   */
  latency: number;

  /**
   * The total number of items that have been processed.
   */
  total: number;

  /**
   * The percentage of the requests that are successful.
   */
  status?: HTTPStatusBucketsType;

  /**
   * The message of the request.
   */
  message?: string;

  /**
   * The cursor of the request.
   */
  cursor?: string;

  /**
   * The stage of the request.
   */
  stage?: "idle" | "requesting" | "retry" | "timeout" | "complete" | "error";
}

/**
 * MetricsReporter collects deltas & overrides,
 * holds internal state, and exposes a live metrics$ stream.
 *
 * Implementation Strategy:
 * - Keeps stream efficient with distinctUntilChanged.
 * - Provides easy access to current state via snapshot().
 * - Automatically recalculates throughput and latency.
 */
export class MetricsReporter {
  #state: MetricsSnapshot;
  #start: number;
  #subject: BehaviorSubject<MetricsSnapshot>;

  readonly metrics$: Observable<MetricsSnapshot>;

  constructor() {
    this.#start = Date.now();
    this.#state = {
      requests: 0,
      duration: 0,
      errors: 0,
      successful: 0,
      throughput: 0,
      latency: 0,
      total: 0,
      message: undefined,
      cursor: undefined,
      stage: "idle"
    };
    this.#subject = new BehaviorSubject<MetricsSnapshot>({ ...this.#state });
    this.metrics$ = this.#subject.asObservable().pipe(distinctUntilChanged(shallowEqual));
  }

  /**
   * Type-safe property assignment helper.
   *
   * @template K - The key of the property to assign.
   *
   * @param key - The property key to assign.
   * @param value - The value to assign.
   *
   * @returns True if the property was assigned, false otherwise.
   */
  #assign<K extends keyof MetricsSnapshot>(key: K, value: MetricsSnapshot[K] | undefined): boolean {
    if (value !== undefined && this.#state[key] !== value) {
      this.#state[key] = value;
      return true;
    }
    return false;
  }

  /**
   * Applies a delta and emits only if the state changes by using a
   * shallow equality check.
   *
   * @param delta - The delta to apply to the current state.
   */
  capture(delta: Partial<MetricsSnapshot>): void {
    let changed = false;

    for (const key in delta) {
      const typedKey = key as keyof MetricsSnapshot;

      if (typedKey === "status") {
        const currentValue = this.#state.status;
        const deltaValue = delta[typedKey] as Partial<Record<keyof HTTPStatusBucketsType, number>> | undefined;
        if (deltaValue !== undefined) {
          this.#assign(typedKey, { ...currentValue, ...deltaValue } as HTTPStatusBucketsType);
        }
      }

      // Handle incremental fields
      if (typedKey === "requests" || typedKey === "total" || typedKey === "errors") {
        const currentValue = this.#state[typedKey] as number;
        const deltaValue = delta[typedKey] as number | undefined;
        if (deltaValue !== undefined) {
          const newValue = currentValue + deltaValue;
          if (this.#assign(typedKey, newValue)) {
            changed = true;
          }
        }
      } else {
        // Handle replacement fields
        if (this.#assign(typedKey, delta[typedKey])) {
          changed = true;
        }
      }
    }

    const elapsed = Date.now() - this.#start;
    const throughput = elapsed > 0 ? this.#state.requests / (elapsed / 1000) : 0;
    const latency = this.#state.duration / Math.max(this.#state.requests, 1);

    if (this.#assign("throughput", throughput) || this.#assign("latency", latency)) {
      changed = true;
    }

    if (changed) {
      this.#subject.next({ ...this.#state });
    }
  }

  /**
   * Returns a snapshot of the current metrics state by cloning the
   * internal state and returning a new object.
   *
   * This is so that the caller can't mutate the internal state.
   *
   * @returns {MetricsSnapshot} - Snapshot of the current metrics state.
   */
  snapshot(): MetricsSnapshot {
    return { ...this.#state };
  }
}
