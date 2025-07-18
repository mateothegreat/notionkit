import type { Scenario } from "$test/scenarios";
import { OperatorSnapshot } from "$test/snapshots";
import type { SearchResponse } from "@notion.codes/types";
import { cyan, cyanBright, gray, yellowBright } from "ansis";
import { firstValueFrom, reduce } from "rxjs";
import { beforeEach, describe, expect, test } from "vitest";
import { SearchOperator } from "./search";

const token = process.env.NOTION_TOKEN || process.env.token;

const scenarios: Scenario[] = [
  {
    name: "defaults",
    request: {
      query: "",
      filter: { value: "page", property: "object" }
    },
    expected: {
      results: 100,
      pages: 1
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
      results: 1,
      pages: 1
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
      results: 3,
      pages: 1
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
      results: 30,
      pages: 3
    },
    timeout: 8000
  }
];

describe(`SearchOperator`, () => {
  let operator: SearchOperator;

  beforeEach(() => {
    operator = new SearchOperator();
  });

  test.each(scenarios)(`${cyanBright("$name")}`, async (scenario) => {
    const snapshot = new OperatorSnapshot({
      operator: "search",
      request: scenario.request,
      httpConfig: {
        baseUrl: "https://api.notion.com/v1",
        timeout: scenario.timeout ?? 8000
      }
    });

    const res = operator.execute(
      snapshot.request,
      {
        ...snapshot.httpConfig,
        headers: {
          ...snapshot.httpConfig.headers,
          Authorization: `Bearer ${token}`
        }
      },
      { timeout: scenario.timeout, limits: scenario.expected }
    );

    let emissions = 0;

    res.reporter.metrics$.subscribe((metrics) => {
      emissions++;
      console.log(`emission sequence: ${yellowBright(emissions)}\n${cyan("metrics")} →`, metrics);
      snapshot.states.push(metrics);
    });

    res.raw$.subscribe(({ status }) => expect(status).toBe(200));

    const results = await firstValueFrom(
      res.data$.pipe(reduce((acc, page) => acc.concat(page.results), [] as SearchResponse["results"]))
    );

    const metrics = res.reporter.snapshot();
    expect(metrics.stage).toBe("complete");

    if (scenario.expected.results && scenario.request.page_size) {
      expect(metrics.requests).toEqual(Math.ceil(scenario.expected.results / scenario.request.page_size));
      expect(emissions).toEqual(Math.ceil(scenario.expected.results / scenario.request.page_size) + 2);
    }

    if (scenario.expected.results) {
      expect(results.length).toEqual(scenario.expected.results);
    }

    await snapshot.save(scenario, results);
    console.log(`${cyan(scenario.name)} →`, results.length);
    console.log(`\n${gray("-".repeat(100))}`);
  });
});
