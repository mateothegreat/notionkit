import { EventEmitter } from "events";
import { Observable, of } from "rxjs";
import type { ExportSummary } from "../types";

/**
 * Performance tracker for monitoring export process metrics.
 *
 * Tracks success/error counts, processed entity types, and duration.
 */
export class PerformanceTracker {
  private startTime = Date.now();
  private successCount = 0;
  private errorCount = 0;
  private processedTypes: Record<string, number> = {};
  private lastError: Error | undefined;

  /**
   * Record a successful entity processing.
   */
  recordSuccess(): void {
    this.successCount++;
  }

  /**
   * Record an error during processing.
   *
   * @param error - Optional error object to store as last error
   */
  recordError(error?: Error): void {
    this.errorCount++;
    if (error) {
      this.lastError = error;
    }
  }

  /**
   * Record that an entity of a specific type was processed.
   *
   * @param type - The entity type that was processed
   */
  recordTypeProcessed(type: string): void {
    this.processedTypes[type] = (this.processedTypes[type] || 0) + 1;
  }

  /**
   * Get a summary of the current performance metrics.
   *
   * @returns Export summary with current metrics
   */
  getSummary(): ExportSummary {
    return {
      successCount: this.successCount,
      errorCount: this.errorCount,
      processedTypes: { ...this.processedTypes },
      duration: Date.now() - this.startTime,
      lastError: this.lastError
    };
  }

  /**
   * Get a summary as an Observable.
   *
   * @returns Observable that emits the current summary
   */
  getSummaryObservable(): Observable<ExportSummary> {
    return of(this.getSummary());
  }
}

/**
 * Convert Node.js EventEmitter events to RxJS Observable.
 *
 * @param emitter - The EventEmitter to observe
 * @param eventName - The event name to listen for
 * @returns Observable that emits event values
 */
export function fromEvent<T = unknown>(emitter: EventEmitter, eventName: string | symbol): Observable<T> {
  return new Observable<T>((subscriber: import("rxjs").Subscriber<T>) => {
    const handler = (value: T) => subscriber.next(value);
    emitter.on(eventName, handler);
    return () => {
      emitter.off(eventName, handler);
    };
  });
}

/**
 * Convert RxJS Observable to event emitter pattern.
 *
 * @param observable - The Observable to convert
 * @returns Function that subscribes to the observable with callbacks
 */
export function toEventEmitter<T>(
  observable: Observable<T>
): (next: (value: T) => void, error?: (error: Error) => void) => () => void {
  return (next: (value: T) => void, error?: (error: Error) => void) => {
    const subscription = observable.subscribe({
      next,
      error: error || (() => {})
    });
    return () => subscription.unsubscribe();
  };
}

/**
 * Make event emitter compatible with RxJS operators.
 *
 * @param emitter - The EventEmitter to make compatible
 * @returns The same EventEmitter instance
 */
export function rxjsCompatibleEventEmitter(emitter: EventEmitter): EventEmitter {
  // This is a placeholder for future enhancements
  // Currently just returns the same emitter
  return emitter;
}
