import type { ReporterStateMap } from "@mateothegreat/ts-kit/observability/metrics/reporter";
import type { Search } from "@notion.codes/types";
import type { HTTPConfig } from "../util/http/client";
import type { Scenario } from "./scenarios";
import { snapshots } from "./util";

export class OperatorSnapshot<T> {
  operator: string;
  scenario: Scenario;
  request: Search;
  httpConfig: HTTPConfig;
  states: ReporterStateMap[];
  results: T;
  created: string = new Date().toISOString();

  constructor(props: Partial<OperatorSnapshot<T>>) {
    this.operator = props.operator;
    this.request = props.request;
    this.httpConfig = props.httpConfig;
    this.states = [];
    this.results = props.results;
  }

  async save(scenario: Scenario, results: T) {
    this.scenario = scenario;
    this.results = results;
    return {
      archive: snapshots.archive(`${this.operator}/${scenario.name.replace(/ /g, "-")}`, this),
      latest: snapshots.latest(`${this.operator}/${scenario.name.replace(/ /g, "-")}`, this)
    };
  }
}
