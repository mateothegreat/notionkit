import type { GetResponse } from "@mateothegreat/notionkit-types/operations/get";
import { set } from "@mateothegreat/ts-kit/observability/metrics/operations";
import type { Reporter } from "@mateothegreat/ts-kit/observability/metrics/reporter";
import { EMPTY, Subject, takeUntil, tap } from "rxjs";
import { HTTP } from "../util/http/client";
import type { HTTPConfig } from "../util/http/config";
import { HTTPResponse } from "../util/http/response";
import type { OperatorConfig, OperatorReport } from "./operator";
import type { GetOperator, GetRequestForResource } from "./runner";

/**
 * Runner for single resource operations (page, database, block).
 *
 * This runner handles GET requests for individual resources that don't require pagination.
 * It's designed to work with resources that return a single response object, as opposed
 * to paginated property requests which are handled by PaginatedPropertyRunner.
 *
 * @template T - The resource type, constrained to single resources (page, database, block)
 */
export class SingleResourceRunner<T extends "page" | "database" | "block"> implements GetOperator<T> {
  constructor(private endpointPrefix: T) {}

  /**
   * Executes a GET request for a single resource.
   *
   * @param request - The request object containing resource type and ID
   * @param http - HTTP configuration
   * @param config - Operator configuration
   * @param reporter - Optional metrics reporter
   * @param cancel$ - Optional cancellation subject
   * @returns HTTPResponse with the requested resource data
   */
  run(
    request: GetRequestForResource<T>,
    http: HTTPConfig,
    config: OperatorConfig,
    reporter?: Reporter<OperatorReport>,
    cancel$?: Subject<void>
  ) {
    const httpRes = HTTP.get<GetResponse<T>>(`/${this.endpointPrefix}s/${request.id}`, http);
    return new HTTPResponse(
      httpRes.data$.pipe(
        takeUntil(cancel$ ?? EMPTY),
        tap(() => reporter?.apply(set("stage", "complete")))
      ),
      httpRes.raw$,
      reporter,
      () => cancel$?.next()
    );
  }
}
