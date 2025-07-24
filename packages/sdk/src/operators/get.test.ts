import { OperatorSnapshot } from "$test/snapshots";
import { type GetPropertyRequest, type GetRequest } from "@mateothegreat/notionkit-types/operations/get";
import {
  isBlockResponse,
  isDatabaseResponse,
  isPageResponse,
  isPropertyListResponse
} from "@mateothegreat/notionkit-types/util";
import { Reporter } from "@mateothegreat/ts-kit/observability/metrics/reporter";
import { cyanBright } from "ansis";
import { firstValueFrom } from "rxjs";
import { describe, expect, test } from "vitest";
import type { Scenario } from "../test/scenarios";
import { HTTPConfig } from "../util/http/config";
import { GetOperator } from "./get";
import type { OperatorReport } from "./operator";

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

describe("GetOperator by resource", () => {
  const operator = new GetOperator();

  test.each(scenarios.filter((s) => s.request.resource === "page"))("page", async (scenario) => {
    const res = operator.page(scenario.request.id, new HTTPConfig({ token }), new Reporter<OperatorReport>());
    const result = await firstValueFrom(res.data$);
    // console.log(result.parent.);
    expect(isPageResponse(result)).toBe(true);
    if (isPageResponse(result)) {
      expect(result.id).toBeDefined();
    }
  });

  test.each(scenarios.filter((s) => s.request.resource === "database"))("database", async (scenario) => {
    const res = operator.database(scenario.request.id, new HTTPConfig({ token }), new Reporter<OperatorReport>());
    const result = await firstValueFrom(res.data$);
    expect(isDatabaseResponse(result)).toBe(true);
    if (isDatabaseResponse(result)) {
      expect(result.id).toBeDefined();
    }
  });

  test.each(scenarios.filter((s) => s.request.resource === "block"))("block", async (scenario) => {
    const res = operator.block(scenario.request.id, new HTTPConfig({ token }), new Reporter<OperatorReport>());
    const result = await firstValueFrom(res.data$);
    expect(isBlockResponse(result)).toBe(true);
    if (isBlockResponse(result)) {
      expect(result.id).toBeDefined();
    }
  });

  test.each(scenarios.filter((s) => s.request.resource === "property"))("property", async (scenario) => {
    if (scenario.request.resource === "property" && "property_id" in scenario.request) {
      const res = operator.property(
        scenario.request.id,
        scenario.request.property_id,
        new HTTPConfig({ token }),
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

describe("GetOperator", () => {
  const operator = new GetOperator();

  test.each(scenarios.filter((s) => s.request.resource !== "property"))(
    `${cyanBright("$name")}`,
    async (scenario) => {
      const snapshot = new OperatorSnapshot<GetRequest | GetPropertyRequest>({
        operator: "get",
        scenario,
        request: scenario.request,
        httpConfig: new HTTPConfig({ token })
      });

      const reporter = new Reporter<OperatorReport>();
      const { request } = snapshot;

      // This guard is essential for TypeScript to understand which overload to use.
      if (request.resource === "property") {
        // We know this won't be hit because of the .filter() on the test suite,
        // but it satisfies the compiler.
        return;
      }

      const res = operator.execute(
        request,
        snapshot.httpConfig,
        {
          timeout: scenario.timeout ?? 15_000
        },
        reporter
      );

      let events = 0;

      reporter.metrics$.subscribe((metrics) => {
        events++;
        snapshot.states.push(metrics);
      });

      // res.raw$.subscribe(async (data) => {
      //   console.log("raw$", await data.json());
      // });

      try {
        const result = await firstValueFrom(res.data$);

        console.log(result.id);
        expect(reporter.snapshot().stage).toBe("complete");
        await snapshot.save(scenario, result);
      } catch (error) {
        console.error(`${cyanBright(scenario.name)} test failed →`, error);
        throw error;
      }
    },
    30_000
  );
});
