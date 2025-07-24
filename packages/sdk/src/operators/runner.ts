import type {
  GetPropertyRequest,
  GetRequestBase,
  GetResourceType,
  GetResponse
} from "@mateothegreat/notionkit-types/operations/get";
import { Reporter } from "@mateothegreat/ts-kit/observability/metrics/reporter";
import { Subject } from "rxjs";
import type { HTTPConfig } from "../util/http/config";
import type { HTTPResponse } from "../util/http/response";
import type { OperatorConfig, OperatorReport } from "./operator";
import { PaginatedPropertyRunner } from "./paginated";
import { SingleResourceRunner } from "./single";

/**
 * Conditional type that maps resource types to their appropriate request types.
 * This ensures proper type safety by separating single resource requests from property requests.
 */
export type GetRequestForResource<T extends GetResourceType> = T extends "property"
  ? GetPropertyRequest
  : T extends "page" | "database" | "block"
    ? Extract<GetRequestBase, { resource: T }>
    : never;

export type GetOperator<T extends GetResourceType = GetResourceType> = {
  run(
    request: GetRequestForResource<T>,
    http: HTTPConfig,
    config: OperatorConfig,
    reporter?: Reporter<OperatorReport>,
    cancel$?: Subject<void>
  ): HTTPResponse<GetResponse<T>>;
};

export const createGetOperator = (resource: GetResourceType): GetOperator => {
  switch (resource) {
    case "page":
      return new SingleResourceRunner("page");
    case "block":
      return new SingleResourceRunner("block");
    case "database":
      return new SingleResourceRunner("database");
    case "property":
      return new PaginatedPropertyRunner();
    default:
      throw new Error(`unsupported resource type: ${resource}`);
  }
};
