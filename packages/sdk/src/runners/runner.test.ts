import { describe, expect, test } from "vitest";
import { createGetRunner } from "./runner";

describe("createGetRunner ", () => {
  test("should create a runner for a single resource", () => {
    const runner = createGetRunner("page");
    expect(runner).toBeDefined();
  });
});
