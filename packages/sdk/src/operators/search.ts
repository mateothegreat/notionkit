import type { Search, SearchResponse } from "@mateothegreat/notionkit-types";
import { add, set } from "@mateothegreat/ts-kit/observability/metrics/operations";
import { Reporter } from "@mateothegreat/ts-kit/observability/metrics/reporter";
import { EMPTY, Subject, defer, timer } from "rxjs";
import { expand, map, takeUntil } from "rxjs/operators";
import { HTTP } from "../util/http/client";
import { HTTPConfig } from "../util/http/config";
import { HTTPResponse } from "../util/http/response";
import { Operator, OperatorConfig, type OperatorReport } from "./operator";

/**
 * Operator for searching across Notion with streaming pagination support.
 */
export class SearchOperator extends Operator<Search, SearchResponse> {
  /**
   * Execute the operator with the given request and configuration with streaming
   * pagination support.
   *
   * @param payload - The search request payload.
   * @param httpConfig - The HTTP configuration.
   * @param operatorConfig - The operator configuration including limits.
   *
   * @returns Observables of response stream.
   */
  execute(
    request: Search,
    httpConfig: HTTPConfig,
    operatorConfig: OperatorConfig,
    reporter?: Reporter<OperatorReport>
  ): HTTPResponse<SearchResponse> {
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

    // Create a subject so the stream can be cancelled if needed.
    const cancelSubject = new Subject<void>();

    // Set a maximum runtime for all operations (i.e. pagination, HTTP requests, etc.).
    // This is a global timeout for the entire operation, not just the HTTP requests.
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

    return this.createPaginatedStream(request, httpConfig, operatorConfig, reporter, cancelSubject);
  }

  /**
   * Create a paginated stream that handles cursor-based pagination automatically with limits.
   *
   * @param request - The search request.
   * @param httpConfig - The HTTP configuration.
   * @param operatorConfig - The operator configuration.
   * @param reporter - The reporter to update.
   * @param cancel$ - The subject to cancel the stream.
   *
   * @returns The HTTP response stream.
   */
  private createPaginatedStream(
    request: Search,
    httpConfig: HTTPConfig,
    operatorConfig: OperatorConfig,
    reporter: Reporter<OperatorReport>,
    cancel$: Subject<void>
  ): HTTPResponse<SearchResponse> {
    // Recursively callable function to make an HTTP request.
    const fetchPage = (body: Search): HTTPResponse<SearchResponse> => {
      return HTTP.post<SearchResponse>("/search", {
        baseUrl: httpConfig.baseUrl,
        timeout: httpConfig.timeout,
        headers: httpConfig.headers,
        body
      });
    };

    const data$ = defer(() => fetchPage(request).data$).pipe(
      // Cancel the stream if anything emits to the cancel$ observable.
      takeUntil(cancel$),
      // Expand out so we can keep fetching pages until we have no more pages or limits are reached.
      expand((response) => {
        reporter.apply(
          add("requests", 1),
          add("items", response.results.length),
          set("cursor", response.next_cursor),
          set("stage", "requesting")
        );
        const state = reporter.snapshot();
        // See if we need to break out of the recursion.
        if (
          // Make sure we're not overshooting the pages limit.
          (operatorConfig.limits?.pages !== undefined && state.requests >= operatorConfig.limits.pages) ||
          // Make sure we're not overshooting the results limit.
          (operatorConfig.limits?.results !== undefined && state.items >= operatorConfig.limits.results) ||
          // Make sure we're not fetching pages that don't have a next cursor.
          !response.has_more ||
          !response.next_cursor
        ) {
          reporter.apply(set("cursor", response.next_cursor), set("stage", "complete"));
          return EMPTY;
        }
        // Keep recursively fetching pages until we have no more pages or limits are reached.
        return fetchPage({ ...request, start_cursor: response.next_cursor }).data$;
      }),
      // If we have a limit and the results overshot the hard limit, slice the results.
      map((response) => {
        if (operatorConfig.limits?.results) {
          const remaining = Math.max(0, operatorConfig.limits.results - reporter.snapshot().items);
          return {
            ...response,
            results: remaining > 0 ? response.results.slice(0, remaining) : response.results
          };
        }
        return response;
      })
    );
    // Start the stream by fetching the initial page first and let recursion handle the rest above.
    // When the caller subscribes to the stream, it will start the processes above.
    return new HTTPResponse(data$, fetchPage(request).raw$, reporter, () => cancel$.next());
  }
}
