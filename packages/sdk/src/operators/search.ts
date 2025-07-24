import { add, set } from "@mateothegreat/ts-kit/observability/metrics/operations";
import { Reporter } from "@mateothegreat/ts-kit/observability/metrics/reporter";
import type { Search, SearchResponse } from "@notion.codes/types/operations/search";
import { EMPTY, Subject, defer, expand, takeUntil, tap } from "rxjs";
import { HTTP } from "../util/http/client";
import { HTTPConfig } from "../util/http/config";
import { HTTPResponse } from "../util/http/response";
import type { OperatorConfig, OperatorReport } from "./operator";

/**
 * Performs a search operation and returns a stream of search results.
 *
 * This runner is responsible for:
 * - Making the initial search request.
 * - Recursively fetching subsequent pages until all results are retrieved or limits are reached.
 * - Applying metrics to the reporter to track progress.
 * - Handling cancellation of the stream.
 */
export class SearchRunner {
  /**
   * Runs the search operation and returns a stream of search results.
   *
   * @param request - The search request.
   * @param http - The HTTP configuration.
   * @param config - The operator configuration.
   * @param reporter - The reporter to update.
   * @param cancel$ - The subject to cancel the stream.
   *
   * @returns The HTTP response stream.
   */
  run(
    request: Search,
    http: HTTPConfig,
    config?: OperatorConfig,
    reporter?: Reporter<OperatorReport>,
    cancel$?: Subject<void>
  ): HTTPResponse<SearchResponse> {
    /**
     * Callable function to make an HTTP request by way of recursion.
     */
    const fetchPage = () => {
      const ret = HTTP.post<SearchResponse>("/search", {
        ...http,
        body: request
      });
      ret.data$.pipe(
        tap((next) => {
          reporter?.apply(set("stage", "paginating"), add("items", next.results.length), add("requests", 1));
        })
      );
      return ret;
    };

    /**
     * Tee-up the initial request and return the HTTPResponse object.
     * When the caller subscribes to the stream, the initial request will be made and
     * pagination, etc. will be handled by the operators below.
     */
    const initial = fetchPage();

    return new HTTPResponse<SearchResponse>(
      /**
       * The `defer(() => initial.data$)` operator defers the emission of the initial
       * data until the caller subscribes to the stream.
       *
       * Observables are "cold" by default, meaning they don't start emitting values
       * until a subscriber is attached.
       */
      defer(() => initial.data$).pipe(
        /**
         * The `takeUntil(cancel$)` operator cancels the observable stream when `cancel$` emits.
         *
         * In this context, we allow the caller to cancel an in-progress pagination request—for example,
         * if the user navigates away or explicitly calls `.cancel()` on the HTTPResponse.
         *
         * If no cancellation subject is provided, we default to `EMPTY` (a noop stream that never emits).
         *
         * This is a common pattern in RxJS to handle cancellation of long-running operations.
         */
        takeUntil(cancel$ ?? EMPTY),

        /**
         * The `expand()` operator recursively emits new inner observables until a termination
         * condition is met.
         *
         * Here, it enables **asynchronous pagination**: each response is checked for a `next_cursor`
         * and if more pages are available and limits haven't been exceeded, a new HTTP request is made.
         * This creates a flat stream of all paginated `SearchResponse` objects emitted in sequence.
         */
        expand((response) => {
          /**
           * Apply metrics for the current response FIRST to ensure the reporter snapshot
           * reflects the current state when checking limits.
           *
           * This is critical because the limits check needs to see the updated metrics
           * that include the current response's contribution.
           */
          reporter?.apply(set("stage", "paginating"), add("items", response.results.length), add("requests", 1));

          /**
           * Get the updated state AFTER applying metrics to ensure we have accurate counts.
           */
          const state = reporter?.snapshot();

          /**
           * Check termination conditions based on the updated state.
           * We stop pagination if:
           * 1. No more pages available (has_more is false).
           * 2. No next cursor provided by the API.
           * 3. Requests limit has been reached or exceeded.
           * 4. Results limit has been reached or exceeded.
           */
          if (
            !response.has_more ||
            !response.next_cursor ||
            (config?.limits?.requests && state && state.requests >= config.limits.requests) ||
            (config?.limits?.results && state && state.items >= config.limits.results)
          ) {
            /**
             * Reporting hook: mark this request as complete.
             * We don't add additional metrics here since they were already applied above.
             */
            reporter?.apply(set("stage", "complete"));
            return EMPTY; // Stop recursion
          }

          /**
           * Perform the next page request using the `next_cursor` from the previous response.
           * This returned observable will be re-fed into `expand()` until an exit condition is met.
           */
          return HTTP.post<SearchResponse>("/search", {
            ...http,
            body: { ...request, start_cursor: response.next_cursor }
          }).data$;
        })
      ),
      /**
       * Raw response observable, used internally by HTTPResponse for initial metadata and tracing.
       */
      initial.raw$,
      /**
       * Optional reporter used to trace lifecycle events like start, pagination, complete, metrics, etc.
       */
      reporter,
      /**
       * Cleanup function to trigger `cancel$` emission when HTTPResponse is externally cancelled.
       *
       * This can then be called like:
       * ```ts
       * const res = runner.run(request, http, config, reporter, cancel$);
       * setTimeout(() => {
       *   cancel$.next();
       * }, 1000);
       * ```
       */
      () => cancel$?.next()
    );
  }
}
