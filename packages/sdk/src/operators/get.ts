import {
  isPropertyListResponse,
  type GetRequest,
  type GetResponse
} from "@mateothegreat/notionkit-types/operations/get";
import { add, set } from "@mateothegreat/ts-kit/observability/metrics/operations";
import { Reporter } from "@mateothegreat/ts-kit/observability/metrics/reporter";
import { EMPTY, Subject, catchError, defer, expand, map, takeUntil, tap, throwError, timer } from "rxjs";
import { getEndpoint } from "../util/endpoints";
import { HTTP } from "../util/http/client";
import { HTTPConfig } from "../util/http/config";
import { HTTPResponse } from "../util/http/response";
import { Operator, OperatorConfig, type OperatorReport } from "./operator";

/**
 * Operator for retrieving resources from Notion with streaming pagination support.
 */
export class GetOperator extends Operator<GetRequest, GetResponse> {
  /**
   * Create a stream for single-response resources (database, page, block).
   */
  #single(
    request: GetRequest,
    httpConfig: HTTPConfig,
    reporter?: Reporter<OperatorReport>,
    cancel$?: Subject<void>
  ): HTTPResponse<GetResponse> {
    const httpResponse = HTTP.get<GetResponse>(getEndpoint(request.resource, request), httpConfig);
    return new HTTPResponse(
      httpResponse.data$.pipe(
        takeUntil(cancel$ ?? EMPTY),
        tap(() => {
          reporter?.apply(add("items", 1), set("stage", "complete"));
        }),
        catchError((error) => {
          reporter?.apply(
            set("stage", "error"),
            add("errors", httpResponse.reporter?.snapshot().errors || 0),
            set(
              "message",
              `${error.status || "unknown"}: ${error.response?.message || error.message}${error.response?.code ? ` (${error.response?.code})` : ""}`
            )
          );
          return throwError(() => error);
        })
      ),
      httpResponse.raw$,
      reporter,
      () => cancel$?.next()
    );
  }

  /**
   * Create a paginated request stream.
   */
  #paginated(
    request: GetRequest & { resource: "property"; property_id: string },
    httpConfig: HTTPConfig,
    operatorConfig: OperatorConfig,
    reporter?: Reporter<OperatorReport>,
    cancel$?: Subject<void>
  ): HTTPResponse<GetResponse> {
    const fetchPage = (req: GetRequest & { resource: "property"; property_id: string }): HTTPResponse<GetResponse> => {
      return HTTP.get<GetResponse>(
        getEndpoint(req.resource, { page_id: req.id, property_id: req.property_id }),
        httpConfig
      );
    };
    return new HTTPResponse(
      defer(() => fetchPage(request).data$).pipe(
        takeUntil(cancel$ ?? EMPTY),
        expand((response) => {
          const state = reporter?.snapshot();
          if (isPropertyListResponse(response)) {
            if (
              (operatorConfig.limits &&
                state &&
                operatorConfig.limits?.pages !== undefined &&
                state.requests >= operatorConfig.limits.pages) ||
              (operatorConfig.limits &&
                state &&
                operatorConfig.limits?.results !== undefined &&
                state.items >= operatorConfig.limits.results) ||
              !response.has_more ||
              !response.next_cursor
            ) {
              reporter?.apply(set("stage", "complete"), add("requests", 1), add("items", response.results.length));
              return EMPTY;
            }
            reporter?.apply(set("stage", "paginating"));
            return fetchPage({ ...request, start_cursor: response.next_cursor }).data$.pipe(
              catchError((error) => {
                reporter?.apply(
                  set("stage", "error"),
                  add("errors", 1),
                  set(
                    "message",
                    `Pagination failed - ${error.status || "unknown"}: ${error.response?.message || error.message}${error.response?.code ? ` (${error.response?.code})` : ""}`
                  )
                );
                return throwError(() => error);
              })
            );
          } else {
            reporter?.apply(set("stage", "complete"), add("requests", 1), add("items", 1));
            return EMPTY;
          }
        }),
        map((response) => {
          if (isPropertyListResponse(response) && operatorConfig.limits?.results) {
            const state = reporter?.snapshot();
            const remaining = Math.max(0, operatorConfig.limits.results - (state?.items ?? 0));
            if (remaining < response.results.length) {
              return {
                ...response,
                results: response.results.slice(0, remaining)
              };
            }
          }
          return response;
        }),
        catchError((error) => {
          reporter?.apply(
            set("stage", "error"),
            add("errors", 1),
            set(
              "message",
              `${error.status || "unknown"}: ${error.response?.message || error.message}${error.response?.code ? ` (${error.response?.code})` : ""}`
            )
          );
          return throwError(() => error);
        })
      ),
      fetchPage(request).raw$,
      reporter,
      () => cancel$?.next()
    );
  }

  /**
   * Execute the get operation with streaming pagination support.
   *
   * @param request - The get request.
   * @param httpConfig - HTTP configuration.
   * @param operatorConfig - Operator configuration.
   * @param reporter - Reporter.
   *
   * @returns An HTTP response instance.
   */
  execute(
    request: GetRequest,
    httpConfig: HTTPConfig,
    operatorConfig: OperatorConfig,
    reporter?: Reporter<OperatorReport>
  ): HTTPResponse<GetResponse> {
    if (!(httpConfig instanceof HTTPConfig)) {
      httpConfig = new HTTPConfig(httpConfig);
    }

    if (!(operatorConfig instanceof OperatorConfig)) {
      operatorConfig = new OperatorConfig(operatorConfig);
    }

    const cancelSubject = new Subject<void>();

    if (operatorConfig.timeout) {
      timer(operatorConfig.timeout)
        .pipe(takeUntil(cancelSubject))
        .subscribe(() => {
          reporter!.apply(
            set("stage", "error"),
            set("message", `operation timed out after ${operatorConfig.timeout}ms`)
          );
          cancelSubject.next();
          cancelSubject.complete();
        });
    }
    // Properties might need pagination, others are single requests (database, page, block).
    if (request.resource === "property" && "property_id" in request) {
      return this.#paginated(request, httpConfig, operatorConfig, reporter, cancelSubject);
    } else {
      return this.#single(request, httpConfig, reporter, cancelSubject);
    }
  }

  page(id: string, httpConfig: HTTPConfig, reporter?: Reporter<OperatorReport>, cancel$?: Subject<void>) {
    return this.#single({ resource: "page", id }, httpConfig, reporter, cancel$);
  }

  database(id: string, httpConfig: HTTPConfig, reporter?: Reporter<OperatorReport>, cancel$?: Subject<void>) {
    return this.#single({ resource: "database", id }, httpConfig, reporter, cancel$);
  }

  block(id: string, httpConfig: HTTPConfig, reporter?: Reporter<OperatorReport>, cancel$?: Subject<void>) {
    return this.#single({ resource: "block", id }, httpConfig, reporter, cancel$);
  }

  property(
    id: string,
    property_id: string,
    httpConfig: HTTPConfig,
    reporter?: Reporter<OperatorReport>,
    cancel$?: Subject<void>
  ) {
    return this.#single({ resource: "property", id, property_id }, httpConfig, reporter, cancel$);
  }
}
