import { describe, expect, it } from "vitest";
import { HTTP } from "./client";

const http = new HTTP();
const baseUrl = "https://httpbin.org";

describe("HTTP client", () => {
  it("should successfully fetch JSON", async () => {
    const { data$: response$, reporter } = HTTP.fetch<{ url: string }>("/get", {
      baseUrl,
      timeout: 5000,
      method: "GET"
    });

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

    const snapshot = reporter.snapshot();
    expect(snapshot.stage).toBe("timeout");
    expect(snapshot.message).toContain("aborted");
  });

  it("should retry on failure", async () => {
    const { data$: response$, reporter } = HTTP.fetch("/status/500", {
      baseUrl,
      timeout: 5000,
      retries: 2,
      backoff: 100,
      method: "GET"
    });

    // await expect(response$.toPromise()).rejects.toThrow("HTTP 500");

    const snapshot = reporter.snapshot();
    console.log(snapshot);

    await new Promise((resolve) => setTimeout(resolve, 3000));

    expect(snapshot.stage).toBe("error");
    expect(snapshot.errors).toBeGreaterThanOrEqual(1);
    expect(snapshot.message).toContain("HTTP 500");
  });
});
