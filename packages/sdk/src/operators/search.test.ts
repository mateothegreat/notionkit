import type { Scenario } from "$test/scenarios";
import { OperatorSnapshot } from "$test/snapshots";
import type { Search, SearchResponse } from "@mateothegreat/notionkit-types";
import { cyanBright } from "ansis";
import { firstValueFrom, reduce } from "rxjs";
import { beforeEach, describe, expect, test } from "vitest";
import { HTTPConfig } from "../util/http/config";
import { SearchOperator } from "./search";

const token = process.env.NOTION_TOKEN || process.env.token;

const scenarios: Scenario<Search>[] = [
  {
    name: "defaults",
    request: {
      query: "",
      filter: { value: "page", property: "object" },
      page_size: 25
    },
    expected: {
      requests: 1
    },
    limits: {
      requests: 1,
      results: 25
    },
    timeout: 8000
  },
  {
    name: "1 size, 1 page, 1 result",
    request: {
      query: "",
      filter: { value: "page", property: "object" },
      page_size: 1
    },
    expected: {
      requests: 1
    },
    limits: {
      requests: 1,
      results: 1
    },
    timeout: 8000
  },
  {
    name: "3 size, 3 pages, 3 results",
    request: {
      query: "",
      filter: { value: "page", property: "object" },
      page_size: 3
    },
    expected: {
      requests: 1
    },
    limits: {
      requests: 1,
      results: 3
    },
    timeout: 8000
  },
  {
    name: "11 page_size, 3 pages, 30 results",
    request: {
      query: "",
      filter: { value: "page", property: "object" },
      page_size: 11
    },
    expected: {
      requests: 3
    },
    limits: {
      requests: 3,
      results: 33
    },
    timeout: 8000
  }
];

describe(
  `SearchOperator`,
  () => {
    let operator: SearchOperator;

    beforeEach(() => {
      operator = new SearchOperator();
    });

    test.each(scenarios)(`${cyanBright("$name")}`, async (scenario) => {
      const snapshot = new OperatorSnapshot<Search>({
        operator: "search",
        scenario,
        request: scenario.request,
        httpConfig: new HTTPConfig({ token })
      });

      const res = operator.execute(snapshot.request, snapshot.httpConfig, {
        timeout: scenario.timeout,
        limits: scenario.limits
      });

      let emissions = 0;

      res.reporter.metrics$.subscribe((metrics) => {
        emissions++;
        snapshot.states.push(metrics);
      });

      res.raw$.subscribe(({ status }) => expect(status).toBe(200));

      const results = await firstValueFrom(
        res.data$.pipe(reduce((acc, page) => acc.concat(page.results), [] as SearchResponse["results"]))
      );

      const metrics = res.reporter.snapshot();
      expect(metrics.stage).toBe("complete");

      expect(metrics.requests).toEqual(scenario.expected.requests);
      expect(emissions).toEqual(scenario.expected.requests! + 2);
      expect(results.length).toEqual(scenario.expected.requests! * scenario.request.page_size!);

      await snapshot.save(scenario, results);
    });
  },
  {
    timeout: 30_000
  }
);
