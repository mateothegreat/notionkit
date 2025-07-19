import type { Scenario } from "$test/scenarios";
import { OperatorSnapshot } from "$test/snapshots";
import { isPropertyListResponse, type GetRequest } from "@mateothegreat/notionkit-types";
import { cyan, cyanBright } from "ansis";
import { firstValueFrom } from "rxjs";
import { beforeEach, describe, expect, test } from "vitest";
import { HTTPConfig } from "../util/http/config";
import { GetOperator } from "./get";

const token = process.env.NOTION_TOKEN || process.env.token;

const scenarios: Scenario<GetRequest>[] = [
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

describe("GetOperator", () => {
  let operator: GetOperator;

  beforeEach(() => {
    operator = new GetOperator();
  });

  test.each(scenarios)(
    `${cyanBright("$name")}`,
    async (scenario) => {
      const snapshot = new OperatorSnapshot<GetRequest>({
        operator: "get",
        scenario,
        request: scenario.request,
        httpConfig: new HTTPConfig({ token })
      });

      const res = operator.execute(snapshot.request, snapshot.httpConfig, {
        timeout: scenario.timeout ?? 15_000
      });

      let events = 0;

      res.reporter.metrics$.subscribe((metrics) => {
        events++;
        snapshot.states.push(metrics);
      });

      try {
        const result = await firstValueFrom(res.data$);

        expect(res.reporter.snapshot().stage).toBe("complete");

        if (isPropertyListResponse(result)) {
          expect(result.results.length).toBeGreaterThan(0);
        } else {
          expect(result.object).toEqual(scenario.request.resource);
        }
        await snapshot.save(scenario, result);
      } catch (error) {
        console.error(`${cyan(scenario.name)} test failed →`, error);
        throw error;
      }
    },
    30_000
  );
});
