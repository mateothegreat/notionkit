import { isPropertyListResponse, type GetRequest, type GetResponse } from "@mateothegreat/notionkit-types";
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

    if (!reporter) {
      reporter = new Reporter<OperatorReport>({
        stage: "requesting",
        requests: 0,
        items: 0,
        errors: 0
      });
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
      return this.paginated(request, httpConfig, operatorConfig, reporter, cancelSubject);
    } else {
      return this.single(request, httpConfig, reporter, cancelSubject);
    }
  }

  /**
   * Create a stream for single-response resources (database, page, block).
   */
  private single(
    request: GetRequest,
    httpConfig: HTTPConfig,
    reporter: Reporter<OperatorReport>,
    cancel$: Subject<void>
  ): HTTPResponse<GetResponse> {
    const httpResponse = HTTP.get<GetResponse>(getEndpoint(request.resource, { id: request.id }), {
      baseUrl: httpConfig.baseUrl,
      timeout: httpConfig.timeout,
      headers: httpConfig.headers
    });
    return new HTTPResponse(
      httpResponse.data$.pipe(
        takeUntil(cancel$),
        tap(() => {
          reporter.apply(add("items", 1), set("stage", "complete"));
        }),
        catchError((error) => {
          reporter.apply(add("errors", 1), set("stage", "error"), set("message", error.message));
          return throwError(() => error);
        })
      ),
      httpResponse.raw$,
      reporter,
      () => cancel$.next()
    );
  }

  /**
   * Create a paginated stream for property requests.
   */
  private paginated(
    request: GetRequest & { resource: "property"; property_id: string },
    httpConfig: HTTPConfig,
    operatorConfig: OperatorConfig,
    reporter: Reporter<OperatorReport>,
    cancel$: Subject<void>
  ): HTTPResponse<GetResponse> {
    const fetchPage = (req: GetRequest & { resource: "property"; property_id: string }): HTTPResponse<GetResponse> => {
      return HTTP.get<GetResponse>(getEndpoint(req.resource, { page_id: req.id, property_id: req.property_id }), {
        baseUrl: httpConfig.baseUrl,
        timeout: httpConfig.timeout,
        headers: httpConfig.headers
      });
    };
    return new HTTPResponse(
      defer(() => fetchPage(request).data$).pipe(
        takeUntil(cancel$),
        expand((response) => {
          const state = reporter.snapshot();
          if (isPropertyListResponse(response)) {
            if (
              (operatorConfig.limits?.pages !== undefined && state.requests >= operatorConfig.limits.pages) ||
              (operatorConfig.limits?.results !== undefined && state.items >= operatorConfig.limits.results) ||
              !response.has_more ||
              !response.next_cursor
            ) {
              reporter.apply(set("stage", "complete"), add("requests", 1), add("items", response.results.length));
              return EMPTY;
            }
            reporter.apply(set("stage", "paginating"));
            return fetchPage({ ...request, start_cursor: response.next_cursor }).data$;
          } else {
            reporter.apply(set("stage", "complete"), add("requests", 1), add("items", 1));
            return EMPTY;
          }
        }),
        map((response) => {
          if (isPropertyListResponse(response) && operatorConfig.limits?.results) {
            const remaining = Math.max(0, operatorConfig.limits.results - reporter.snapshot().items);
            if (remaining < response.results.length) {
              return {
                ...response,
                results: response.results.slice(0, remaining)
              };
            }
          }
          return response;
        })
      ),
      fetchPage(request).raw$,
      reporter,
      () => cancel$.next()
    );
  }
}
