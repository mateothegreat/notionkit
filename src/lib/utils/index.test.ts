import { EventEmitter } from "events";
import { Subject } from "rxjs";
import { inspect } from "util";
import { beforeEach, describe, expect, it } from "vitest";
import type { ExportSummary } from "../types";
import { PerformanceTracker, fromEvent, rxjsCompatibleEventEmitter, toEventEmitter } from "./index";

describe("PerformanceTracker", () => {
  let tracker: PerformanceTracker;

  beforeEach(() => {
    tracker = new PerformanceTracker();
  });

  describe("recordSuccess", () => {
    it("should increment success count", () => {
      tracker.recordSuccess();
      tracker.recordSuccess();
      const summary = tracker.getSummary();
      console.log(inspect(summary, { colorize: true, compact: false }));
      expect(summary.successCount).toBe(2);
    });
  });

  describe("recordError", () => {
    it("should increment error count", () => {
      tracker.recordError();
      tracker.recordError();
      const summary = tracker.getSummary();
      console.log(inspect(summary, { colorize: true, compact: false }));
      expect(summary.errorCount).toBe(2);
    });

    it("should store last error when provided", () => {
      const error1 = new Error("First error");
      const error2 = new Error("Second error");
      tracker.recordError(error1);
      tracker.recordError(error2);
      const summary = tracker.getSummary();
      console.log(inspect(summary, { colorize: true, compact: false }));
      expect(summary.lastError).toBe(error2);
    });

    it("should not require error parameter", () => {
      tracker.recordError();
      const summary = tracker.getSummary();
      console.log(inspect(summary, { colorize: true, compact: false }));
      expect(summary.errorCount).toBe(1);
      expect(summary.lastError).toBeUndefined();
    });
  });

  describe("recordTypeProcessed", () => {
    it("should track counts by type", () => {
      tracker.recordTypeProcessed("page");
      tracker.recordTypeProcessed("page");
      tracker.recordTypeProcessed("block");
      const summary = tracker.getSummary();
      console.log(inspect(summary, { colorize: true, compact: false }));
      expect(summary.processedTypes.page).toBe(2);
      expect(summary.processedTypes.block).toBe(1);
    });

    it("should initialize type count if not exists", () => {
      tracker.recordTypeProcessed("database");
      const summary = tracker.getSummary();
      console.log(inspect(summary, { colorize: true, compact: false }));
      expect(summary.processedTypes.database).toBe(1);
    });
  });

  describe("getSummary", () => {
    it("should return complete summary", () => {
      const startTime = Date.now();
      tracker.recordSuccess();
      tracker.recordSuccess();
      tracker.recordError(new Error("Test error"));
      tracker.recordTypeProcessed("page");
      tracker.recordTypeProcessed("block");

      const summary = tracker.getSummary();
      console.log(inspect(summary, { colorize: true, compact: false }));

      expect(summary.successCount).toBe(2);
      expect(summary.errorCount).toBe(1);
      expect(summary.processedTypes).toEqual({ page: 1, block: 1 });
      expect(summary.duration).toBeGreaterThanOrEqual(0);
      expect(summary.lastError?.message).toBe("Test error");
    });

    it("should calculate duration correctly", async () => {
      const tracker = new PerformanceTracker();
      await new Promise((resolve) => setTimeout(resolve, 100));

      const summary = tracker.getSummary();
      console.log(inspect(summary, { colorize: true, compact: false }));
      expect(summary.duration).toBeGreaterThanOrEqual(100);
    });
  });

  describe("getSummaryObservable", () => {
    it("should return observable that emits summary", async () => {
      tracker.recordSuccess();
      tracker.recordError();

      const observable = await tracker.getSummaryObservable();
      const summaries: ExportSummary[] = [];

      observable.subscribe((summary) => {
        summaries.push(summary);
      });

      console.log(inspect(summaries, { colorize: true, compact: false }));
      expect(summaries).toHaveLength(1);
      expect(summaries[0].successCount).toBe(1);
      expect(summaries[0].errorCount).toBe(1);
    });
  });
});

describe("fromEvent", () => {
  it("should convert EventEmitter events to Observable", () => {
    const emitter = new EventEmitter();
    const values: string[] = [];

    const observable = fromEvent<string>(emitter, "test");
    const subscription = observable.subscribe((value) => {
      values.push(value);
    });

    emitter.emit("test", "value1");
    emitter.emit("test", "value2");

    console.log(inspect(values, { colorize: true, compact: false }));
    expect(values).toEqual(["value1", "value2"]);

    subscription.unsubscribe();
  });

  it("should handle multiple subscribers", () => {
    const emitter = new EventEmitter();
    const values1: string[] = [];
    const values2: string[] = [];

    const observable = fromEvent<string>(emitter, "test");

    const sub1 = observable.subscribe((value) => values1.push(value));
    const sub2 = observable.subscribe((value) => values2.push(value));

    emitter.emit("test", "value");

    console.log(inspect({ values1, values2 }, { colorize: true, compact: false }));
    expect(values1).toEqual(["value"]);
    expect(values2).toEqual(["value"]);

    sub1.unsubscribe();
    sub2.unsubscribe();
  });

  it("should stop listening when unsubscribed", () => {
    const emitter = new EventEmitter();
    const values: string[] = [];

    const observable = fromEvent<string>(emitter, "test");
    const subscription = observable.subscribe((value) => {
      values.push(value);
    });

    emitter.emit("test", "value1");
    subscription.unsubscribe();
    emitter.emit("test", "value2");

    console.log(inspect(values, { colorize: true, compact: false }));
    expect(values).toEqual(["value1"]);
  });

  it("should handle symbol event names", () => {
    const emitter = new EventEmitter();
    const eventSymbol = Symbol("test");
    const values: string[] = [];

    const observable = fromEvent<string>(emitter, eventSymbol);
    const subscription = observable.subscribe((value) => {
      values.push(value);
    });

    emitter.emit(eventSymbol, "symbol-value");

    console.log(inspect(values, { colorize: true, compact: false }));
    expect(values).toEqual(["symbol-value"]);

    subscription.unsubscribe();
  });
});

describe("toEventEmitter", () => {
  it("should convert Observable to event emitter pattern", () => {
    const subject = new Subject<string>();
    const values: string[] = [];

    const emitterFunc = toEventEmitter(subject);
    const unsubscribe = emitterFunc((value) => {
      values.push(value);
    });

    subject.next("value1");
    subject.next("value2");

    console.log(inspect(values, { colorize: true, compact: false }));
    expect(values).toEqual(["value1", "value2"]);

    unsubscribe();
  });

  it("should handle unsubscription", () => {
    const subject = new Subject<string>();
    const values: string[] = [];

    const emitterFunc = toEventEmitter(subject);
    const unsubscribe = emitterFunc((value) => {
      values.push(value);
    });

    subject.next("value1");
    unsubscribe();
    subject.next("value2");

    console.log(inspect(values, { colorize: true, compact: false }));
    expect(values).toEqual(["value1"]);
  });

  it("should handle errors in observable", () => {
    const subject = new Subject<string>();
    const values: string[] = [];
    const errors: Error[] = [];

    const emitterFunc = toEventEmitter(subject);
    const unsubscribe = emitterFunc(
      (value) => values.push(value),
      (error) => errors.push(error)
    );

    subject.next("value1");
    subject.error(new Error("Test error"));

    console.log(inspect({ values, errors }, { colorize: true, compact: false }));
    expect(values).toEqual(["value1"]);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toBe("Test error");
  });
});

describe("rxjsCompatibleEventEmitter", () => {
  it("should return the same EventEmitter instance", () => {
    const emitter = new EventEmitter();
    const result = rxjsCompatibleEventEmitter(emitter);

    console.log(inspect({ same: result === emitter }, { colorize: true, compact: false }));
    expect(result).toBe(emitter);
  });

  it("should preserve EventEmitter functionality", () => {
    const emitter = new EventEmitter();
    const compatibleEmitter = rxjsCompatibleEventEmitter(emitter);
    const values: string[] = [];

    compatibleEmitter.on("test", (value) => {
      values.push(value);
    });

    compatibleEmitter.emit("test", "value1");
    compatibleEmitter.emit("test", "value2");

    console.log(inspect(values, { colorize: true, compact: false }));
    expect(values).toEqual(["value1", "value2"]);
  });
});
