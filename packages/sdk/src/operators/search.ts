import { add, set } from "@mateothegreat/ts-kit/observability/metrics/operations";
import { Reporter } from "@mateothegreat/ts-kit/observability/metrics/reporter";
import type { Search, SearchResponse } from "@notion.codes/types";
import { EMPTY, Subject, defer, timer } from "rxjs";
import { expand, map, takeUntil } from "rxjs/operators";
import { HTTP, HTTPResponse, type HTTPConfig } from "../util/http/client";
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
    operatorConfig: OperatorConfig = new OperatorConfig()
  ): HTTPResponse<SearchResponse> {
    const reporter = new Reporter<OperatorReport>({
      stage: "requesting",
      requests: 0,
      total: 0,
      errors: 0
    });

    // Create a subject so the stream can be cancelled if needed.
    const cancelSubject = new Subject<void>();

    // Set a maximum runtime for all operations (i.e. pagination, HTTP requests, etc.).
    // This is a global timeout for the entire operation, not just the HTTP requests.
    if (operatorConfig.timeout) {
      timer(operatorConfig.timeout)
        .pipe(takeUntil(cancelSubject))
        .subscribe(() => {
          reporter.apply(
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
    const fetchPage = (req: Search): HTTPResponse<SearchResponse> => {
      return HTTP.post<SearchResponse>("/search", {
        baseUrl: httpConfig.baseUrl,
        timeout: httpConfig.timeout,
        headers: {
          "Content-Type": "application/json",
          "Notion-Version": "2022-06-28",
          ...httpConfig.headers
        },
        body: req
      });
    };

    const data$ = defer(() => fetchPage(request).data$).pipe(
      // Cancel the stream if anything emits to the cancel$ observable.
      takeUntil(cancel$),
      // Expand out so we can keep fetching pages until we have no more pages or limits are reached.
      expand((response) => {
        const state = reporter.snapshot();
        // Apply state before limit checks
        reporter.apply(add("requests", 1), add("total", response.results.length), set("cursor", response.next_cursor));
        // See if we need to break out of the recursion.
        if (
          // Make sure we're not overshooting the pages limit.
          (operatorConfig.limits?.pages !== undefined && state.requests >= operatorConfig.limits.pages) ||
          // Make sure we're not overshooting the results limit.
          (operatorConfig.limits?.results !== undefined && state.total >= operatorConfig.limits.results) ||
          // Make sure we're not fetching pages that don't have a next cursor.
          !response.has_more ||
          !response.next_cursor
        ) {
          reporter.apply(
            set("stage", "complete"),
            set(
              "message",
              `pagination ended with ${operatorConfig.limits ? operatorConfig.limits?.results : state.total + response.results.length} results from ${state.requests + 1} pages`
            )
          );
          return EMPTY;
        }
        // Continue, there are more pages to fetch.
        reporter.apply(set("stage", "requesting"));
        // Keep recursively fetching pages until we have no more pages or limits are reached.
        return fetchPage({ ...request, start_cursor: response.next_cursor }).data$;
      }),
      // If we have a limit and the results overshot the hard limit, slice the results.
      map((response) => {
        const remaining = Math.max(0, operatorConfig.limits.results - reporter.snapshot().total);
        return {
          ...response,
          results: remaining > 0 ? response.results.slice(0, remaining) : response.results
        };
      })
    );
    // Start the stream by fetching the initial page first and let recursion handle the rest above.
    // When the caller subscribes to the stream, it will start the processes above.
    return new HTTPResponse(data$, fetchPage(request).raw$, reporter, () => cancel$.next());
  }
}
