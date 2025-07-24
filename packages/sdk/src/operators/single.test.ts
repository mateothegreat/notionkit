import { type GetPropertyRequest, type GetRequest } from "@mateothegreat/notionkit-types/operations/get";
import {
  isBlockResponse,
  isDatabaseResponse,
  isPageResponse,
  isPropertyListResponse
} from "@mateothegreat/notionkit-types/util";
import { Reporter } from "@mateothegreat/ts-kit/observability/metrics/reporter";
import { firstValueFrom } from "rxjs";
import { describe, expect, test } from "vitest";
import type { Scenario } from "../test/scenarios";
import { HTTPConfig } from "../util/http/config";
import { OperatorConfig, type OperatorReport } from "./operator";
import { createGetRunner } from "./runner";

const token = process.env.NOTION_TOKEN || process.env.token;

const scenarios: Scenario<GetRequest | GetPropertyRequest>[] = [
  {
    name: "get single page",
    request: {
      resource: "page",
      id: "22cd7342e57180d292f7c90f552b68f2"
    },
    expected: {
      requests: 1
    }
  },
  {
    name: "get single database",
    request: {
      resource: "database",
      id: "16ad7342e57180c4a065c7a1015871d3"
    },
    expected: {
      requests: 1
    }
  },
  {
    name: "get single block",
    request: {
      resource: "block",
      id: "22cd7342-e571-8096-9127-c48e806cf469"
    },
    expected: {
      requests: 1
    }
  },
  {
    name: "get single property",
    request: {
      resource: "property",
      id: "234d7342-e571-8186-b047-fb21820f604b",
      property_id: "wYBP"
    },
    expected: {
      requests: 1
    }
  },
  {
    name: "get single synced block",
    request: {
      resource: "block",
      id: "234d7342-e571-80c6-8a59-e869a1522417"
    },
    expected: {
      requests: 1
    }
  }
];

describe("GetRunner by resource", () => {
  test.each(scenarios.filter((s) => s.request.resource === "page"))("page", async (scenario) => {
    const runner = createGetRunner("page");
    const res = runner.run(
      scenario.request as Extract<typeof scenario.request, { resource: "page" }>,
      new HTTPConfig({ token }),
      new OperatorConfig(),
      new Reporter<OperatorReport>()
    );
    const result = await firstValueFrom(res.data$);
    expect(isPageResponse(result)).toBe(true);
  });

  test.each(scenarios.filter((s) => s.request.resource === "database"))("database", async (scenario) => {
    const runner = createGetRunner("database");
    const res = runner.run(
      scenario.request as Extract<typeof scenario.request, { resource: "database" }>,
      new HTTPConfig({ token }),
      new OperatorConfig(),
      new Reporter<OperatorReport>()
    );
    const result = await firstValueFrom(res.data$);
    expect(isDatabaseResponse(result)).toBe(true);
    if (isDatabaseResponse(result)) {
      expect(result.id).toBeDefined();
    }
  });

  test.each(scenarios.filter((s) => s.request.resource === "block"))("block", async (scenario) => {
    const runner = createGetRunner("block");
    const res = runner.run(
      scenario.request as Extract<typeof scenario.request, { resource: "block" }>,
      new HTTPConfig({ token }),
      new OperatorConfig(),
      new Reporter<OperatorReport>()
    );
    const result = await firstValueFrom(res.data$);
    expect(isBlockResponse(result)).toBe(true);
    if (isBlockResponse(result)) {
      expect(result.id).toBeDefined();
    }
  });

  test.each(scenarios.filter((s) => s.request.resource === "property"))("property", async (scenario) => {
    if (scenario.request.resource === "property" && "property_id" in scenario.request) {
      const runner = createGetRunner("property");
      const res = runner.run(
        scenario.request,
        new HTTPConfig({ token }),
        new OperatorConfig(),
        new Reporter<OperatorReport>()
      );
      const result = await firstValueFrom(res.data$);
      expect(isPropertyListResponse(result)).toBe(true);
      if (isPropertyListResponse(result)) {
        expect(result.results.length).toBeGreaterThan(0);
      }
    }
  });
});
