import type { Scenario } from "$test/scenarios";
import { OperatorSnapshot } from "$test/snapshots";
import type { Search, SearchResponse } from "@mateothegreat/notionkit-types/operations/search";
import { Reporter } from "@mateothegreat/ts-kit/observability/metrics/reporter";
import { cyanBright } from "ansis";
import { firstValueFrom, reduce } from "rxjs";
import { describe, expect, test } from "vitest";
import { HTTPConfig } from "../util/http/config";
import type { OperatorReport } from "./operator";
import { SearchRunner } from "./search";

const token = process.env.NOTION_TOKEN || process.env.token;

const scenarios: Scenario<Search>[] = [
  {
    name: "should stop after 2 requests",
    request: {
      query: "",
      filter: { value: "page", property: "object" },
      page_size: 2
    },
    expected: {
      requests: 2
    },
    timeout: 10_000
  },
  {
    name: "should stop after 10 results",
    request: {
      query: "",
      filter: { value: "page", property: "object" },
      page_size: 5
    },
    expected: {
      results: 10
    },
    timeout: 10_000
  }
];

describe(`SearchRunner`, () => {
  test.each(scenarios)(
    `${cyanBright("$name")}`,
    {
      timeout: 15_000
    },
    async (scenario) => {
      const runner = new SearchRunner();
      const start = performance.now();
      const snapshot = new OperatorSnapshot<Search>({
        operator: "search",
        scenario,
        request: scenario.request,
        httpConfig: new HTTPConfig({ token })
      });
      const reporter = new Reporter<OperatorReport>();
      const res = runner.run(
        snapshot.request,
        snapshot.httpConfig,
        {
          timeout: scenario.timeout,
          limits: scenario.expected
        },
        reporter
      );

      res.raw$.subscribe(({ status }) => expect(status).toBe(200));

      const results = await firstValueFrom(
        res.data$.pipe(reduce((acc, page) => acc.concat(page.results), [] as SearchResponse["results"]))
      );

      expect(reporter.snapshot().stage).toBe("complete");

      if (scenario.expected.requests) {
        expect(reporter.snapshot().requests).toEqual(scenario.expected.requests);
      }

      if (scenario.expected.results) {
        expect(results.length).toEqual(scenario.expected.results);
      }

      await snapshot.save(scenario, results);
    }
  );
});
