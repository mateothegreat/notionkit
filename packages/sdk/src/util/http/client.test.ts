import { Reporter } from "@mateothegreat/ts-kit/observability/metrics/reporter";
import { beforeAll, describe, expect, it } from "vitest";
import type { OperatorReport } from "../../operators/operator";
import { HTTP } from "./client";

const http = new HTTP();
const baseUrl = "https://httpbin.org";

describe("HTTP client", () => {
  let reporter: Reporter<OperatorReport>;
  beforeAll(() => {
    reporter = new Reporter<OperatorReport>();
  });
  it("should successfully fetch JSON", async () => {
    const { data$: response$ } = HTTP.fetch<{ url: string }>(
      "/get",
      {
        baseUrl,
        timeout: 5000,
        method: "GET"
      },
      reporter
    );

    const result = await response$.toPromise();
    expect(result?.url).toContain("httpbin.org/get");

    const snapshot = reporter.snapshot();
    expect(snapshot.stage).toBe("complete");
    expect(snapshot.message).toBeUndefined();
  });

  it("should timeout if request takes too long", async () => {
    const { data$: response$, reporter } = HTTP.fetch("/delay/10", {
      baseUrl,
      timeout: 1000,
      method: "GET"
    });

    await expect(response$.toPromise()).rejects.toThrow("aborted request after 1000ms due to timeout");

    const snapshot = reporter!.snapshot();
    expect(snapshot.stage).toBe("timeout");
    expect(snapshot.message).toContain("aborted");
  });

  it("should NOT retry on 4xx client errors and return immediately", async () => {
    const startTime = Date.now();
    const { data$: response$, reporter } = HTTP.fetch("/status/404", {
      baseUrl,
      timeout: 5000,
      retries: 3,
      backoff: 500,
      method: "GET"
    });

    await expect(response$.toPromise()).rejects.toThrow("HTTP 404");

    const duration = Date.now() - startTime;
    // Should fail without retries (less than 5 seconds)
    expect(duration).toBeLessThan(5000);

    const snapshot = reporter!.snapshot();
    expect(snapshot.stage).toBe("error");
    expect(snapshot.errors).toBe(1); // Only one error, no retries
    expect(snapshot.message).toContain("HTTP 404");
  });

  it("should NOT retry on 5xx server errors (except 502, 503, 504) and return immediately", async () => {
    const startTime = Date.now();
    const { data$: response$, reporter } = HTTP.fetch("/status/500", {
      baseUrl,
      timeout: 5000,
      retries: 3,
      backoff: 200,
      method: "GET"
    });

    await expect(response$.toPromise()).rejects.toThrow("HTTP 500");

    const duration = Date.now() - startTime;
    // Should fail without retries (less than 5 seconds)
    expect(duration).toBeLessThan(5000);

    const snapshot = reporter!.snapshot();
    expect(snapshot.stage).toBe("error");
    expect(snapshot.errors).toBe(1); // Only one error, no retries
    expect(snapshot.message).toContain("HTTP 500");
  });

  it("should retry on 502 Bad Gateway errors", async () => {
    const startTime = Date.now();
    const { data$: response$, reporter } = HTTP.fetch("/status/502", {
      baseUrl,
      timeout: 5000,
      retries: 2,
      backoff: 100,
      method: "GET"
    });

    await expect(response$.toPromise()).rejects.toThrow("HTTP 502");

    const duration = Date.now() - startTime;
    // Should take time due to retries (at least 300ms for 2 retries with 100ms backoff)
    expect(duration).toBeGreaterThan(1000);

    const snapshot = reporter!.snapshot();
    expect(snapshot.stage).toBe("error");
    expect(snapshot.errors).toBeGreaterThan(1); // Multiple errors due to retries
    expect(snapshot.message).toContain("HTTP 502");
  });

  it("should retry on 503 Service Unavailable errors", async () => {
    const startTime = Date.now();
    const { data$: response$, reporter } = HTTP.fetch("/status/503", {
      baseUrl,
      timeout: 5000,
      retries: 2,
      backoff: 100,
      method: "GET"
    });

    await expect(response$.toPromise()).rejects.toThrow("HTTP 503");

    const duration = Date.now() - startTime;
    // Should take time due to retries
    expect(duration).toBeGreaterThan(1000);

    const snapshot = reporter!.snapshot();
    expect(snapshot.stage).toBe("error");
    expect(snapshot.errors).toBeGreaterThan(1); // Multiple errors due to retries
    expect(snapshot.message).toContain("HTTP 503");
  });

  it("should retry on 504 Gateway Timeout errors", async () => {
    const startTime = Date.now();
    const { data$: response$, reporter } = HTTP.fetch("/status/504", {
      baseUrl,
      timeout: 5000,
      retries: 2,
      backoff: 100,
      method: "GET"
    });

    await expect(response$.toPromise()).rejects.toThrow("HTTP 504");

    const duration = Date.now() - startTime;
    // Should take time due to retries
    expect(duration).toBeGreaterThan(1000);

    const snapshot = reporter!.snapshot();
    expect(snapshot.stage).toBe("error");
    expect(snapshot.errors).toBeGreaterThan(1); // Multiple errors due to retries
    expect(snapshot.message).toContain("HTTP 504");
  });

  it("should retry on network errors", async () => {
    // Test with an invalid URL to simulate network error
    const { data$: response$, reporter } = HTTP.fetch("/get", {
      baseUrl: "https://invalid-domain-that-does-not-exist.com",
      timeout: 5000,
      retries: 2,
      backoff: 100,
      method: "GET"
    });

    await expect(response$.toPromise()).rejects.toThrow();

    const snapshot = reporter!.snapshot();
    expect(snapshot.stage).toBe("error");
    expect(snapshot.errors).toBeGreaterThan(1); // Should have retried
  });

  describe("isRetryableError", () => {
    it("should identify network errors as retryable", () => {
      const networkError = new TypeError("fetch failed");
      expect((HTTP as any).isRetryableError(networkError)).toBe(true);
    });

    it("should identify timeout errors as retryable", () => {
      const timeoutError = new Error("timeout occurred");
      expect((HTTP as any).isRetryableError(timeoutError)).toBe(true);

      const abortError = new Error("AbortError");
      abortError.name = "AbortError";
      expect((HTTP as any).isRetryableError(abortError)).toBe(true);
    });

    it("should identify retryable HTTP status codes as retryable", () => {
      const error502 = new Error("HTTP 502");
      (error502 as any).isHttpError = true;
      (error502 as any).status = 502;
      expect((HTTP as any).isRetryableError(error502)).toBe(true);

      const error503 = new Error("HTTP 503");
      (error503 as any).isHttpError = true;
      (error503 as any).status = 503;
      expect((HTTP as any).isRetryableError(error503)).toBe(true);

      const error504 = new Error("HTTP 504");
      (error504 as any).isHttpError = true;
      (error504 as any).status = 504;
      expect((HTTP as any).isRetryableError(error504)).toBe(true);
    });

    it("should identify non-retryable HTTP status codes as non-retryable", () => {
      const error400 = new Error("HTTP 400");
      (error400 as any).isHttpError = true;
      (error400 as any).status = 400;
      expect((HTTP as any).isRetryableError(error400)).toBe(false);

      const error404 = new Error("HTTP 404");
      (error404 as any).isHttpError = true;
      (error404 as any).status = 404;
      expect((HTTP as any).isRetryableError(error404)).toBe(false);

      const error500 = new Error("HTTP 500");
      (error500 as any).isHttpError = true;
      (error500 as any).status = 500;
      expect((HTTP as any).isRetryableError(error500)).toBe(false);

      const error501 = new Error("HTTP 501");
      (error501 as any).isHttpError = true;
      (error501 as any).status = 501;
      expect((HTTP as any).isRetryableError(error501)).toBe(false);
    });

    it("should identify unknown errors as non-retryable", () => {
      const unknownError = new Error("Unknown error");
      expect((HTTP as any).isRetryableError(unknownError)).toBe(false);
    });
  });
});
