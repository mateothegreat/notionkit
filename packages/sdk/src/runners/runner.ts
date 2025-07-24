import type { GetRequest, GetResourceType, GetResponse } from "@mateothegreat/notionkit-types/operations/get";
import { Reporter } from "@mateothegreat/ts-kit/observability/metrics/reporter";
import { Subject } from "rxjs";
import type { OperatorConfig, OperatorReport } from "../operators/operator";
import type { HTTPConfig } from "../util/http/config";
import type { HTTPResponse } from "../util/http/response";
import { PaginatedPropertyRunner, SingleResourceRunner } from "./single-resource-runner";

export type GetRunner<T extends GetResourceType = GetResourceType> = {
  run(
    request: Extract<GetRequest, { resource: T }>,
    http: HTTPConfig,
    config: OperatorConfig,
    reporter: Reporter<OperatorReport>,
    cancel$: Subject<void>
  ): HTTPResponse<GetResponse<T>>;
};

export function createGetRunner(resource: GetResourceType): GetRunner {
  switch (resource) {
    case "page":
      return new SingleResourceRunner("page");
    case "block":
      return new SingleResourceRunner("block");
    case "database":
      return new SingleResourceRunner("database");
    case "property":
      return new PaginatedPropertyRunner();
  }
}
