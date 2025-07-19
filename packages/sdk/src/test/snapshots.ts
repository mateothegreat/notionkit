import type { ReporterStateMap } from "@mateothegreat/ts-kit/observability/metrics/reporter";
import type { HTTPConfig } from "../util/http/config";
import type { Scenario } from "./scenarios";
import { snapshots } from "./util";

export type OperatorSnapshotProps<T> = {
  operator: string;
  scenario: Scenario<T>;
  request: T;
  httpConfig: HTTPConfig;
  states?: ReporterStateMap[];
  results?: T;
};

export class OperatorSnapshot<T> implements OperatorSnapshotProps<T> {
  operator: string;
  scenario: Scenario<T>;
  request: T;
  httpConfig: HTTPConfig;
  states: ReporterStateMap[];
  results?: T;
  created: string = new Date().toISOString();

  constructor(props: OperatorSnapshotProps<T>) {
    this.operator = props.operator;
    this.scenario = props.scenario;
    this.request = props.request;
    this.httpConfig = props.httpConfig;
    this.states = props.states ?? [];
    this.results = props.results ?? undefined;
  }

  async save(scenario: Scenario<T>, results: any) {
    this.scenario = scenario;
    this.results = results;
    return {
      archive: snapshots.archive(`${this.operator}/${scenario.name.replace(/ /g, "-")}`, this),
      latest: snapshots.latest(`${this.operator}/${scenario.name.replace(/ /g, "-")}`, this)
    };
  }
}
