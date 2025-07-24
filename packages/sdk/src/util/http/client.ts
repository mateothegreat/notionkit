import { add, set } from "@mateothegreat/ts-kit/observability/metrics/operations";
import { Reporter } from "@mateothegreat/ts-kit/observability/metrics/reporter";
import { race, throwError, timer } from "rxjs";
import { fromFetch } from "rxjs/fetch";
import { catchError, delayWhen, map, retryWhen, scan, shareReplay, switchMap } from "rxjs/operators";
import type { OperatorReport } from "../../operators/operator";
import type { HTTPConfig } from "./config";
import { HTTPResponse } from "./response";

/**
 * Execute HTTP requests with comprehensive error handling, retry logic, and observability.
 *
 * Key features:
 * - **Raw Response Access**: The raw$ observable provides access to the complete Response
 *   object including status codes, headers, and other metadata before JSON parsing
 * - **Parsed Data Stream**: The data$ observable delivers the parsed JSON response or
 *   propagates errors for failed requests
 * - **Shared Execution**: Uses shareReplay(1) to ensure the fetch request executes only
 *   once, even with multiple subscribers to both raw$ and data$ observables
 * - **Smart Retry Logic**: Only retries on network errors, timeouts, and specific retryable
 *   HTTP status codes (502, 503, 504). Client errors (4xx) and most server errors return immediately
 * - **Exponential Backoff**: Implements configurable retry logic with exponential backoff
 *   for transient failures
 * - **Real-time Metrics**: Provides live observability through MetricsReporter for
 *   monitoring request lifecycle, errors, and performance
 * - **Timeout Handling**: Supports request cancellation via AbortController
 */
export class HTTP {
  /**
   * Determines if an error should be retried based on its type and characteristics.
   *
   * Retryable errors include:
   * - Network errors (fetch failures, connection issues)
   * - Timeout errors (AbortError, timeout messages)
   * - Specific HTTP status codes: 502 (Bad Gateway), 503 (Service Unavailable), 504 (Gateway Timeout)
   *
   * Non-retryable errors include:
   * - Client errors (4xx status codes)
   * - Most server errors (5xx except 502, 503, 504)
   * - Parse errors and other application-level errors
   *
   * @param error - The error object to evaluate for retry eligibility.
   */
  private static isRetryableError(error: any): boolean {
    // Network errors (fetch failures, connection refused, etc.)
    if (error.name === "TypeError" && error.message.includes("fetch")) {
      return true;
    }

    // Timeout errors
    if (error.name === "AbortError" || error.message.includes("timeout")) {
      return true;
    }

    // HTTP errors - only retry specific server errors
    if (error.isHttpError && error.status) {
      const retryableStatuses = [502, 503, 504]; // Bad Gateway, Service Unavailable, Gateway Timeout
      return retryableStatuses.includes(error.status);
    }

    // Default to not retrying unknown errors
    return false;
  }

  /**
   * Executes an HTTP request with comprehensive error handling, retry logic, and observability.
   *
   * This method provides access to both the parsed response data and the raw Response object
   * through separate observables. The implementation uses RxJS to handle the asynchronous
   * nature of HTTP requests while providing real-time metrics and retry capabilities.
   *
   * Key features:
   * - **Raw Response Access**: The raw$ observable provides access to the complete Response
   *   object including status codes, headers, and other metadata before JSON parsing.
   * - **Parsed Data Stream**: The data$ observable delivers the parsed JSON response or
   *   propagates errors for failed requests.
   * - **Shared Execution**: Uses shareReplay(1) to ensure the fetch request executes only
   *   once, even with multiple subscribers to both raw$ and data$ observables.
   * - **Smart Retry Logic**: Only retries on network errors, timeouts, and specific retryable
   *   HTTP status codes (502, 503, 504). Client errors (4xx) and most server errors return immediately.
   * - **Exponential Backoff**: Implements configurable retry logic with exponential backoff
   *   for transient failures.
   * - **Real-time Metrics**: Provides live observability through MetricsReporter for
   *   monitoring request lifecycle, errors, and performance.
   * - **Timeout Handling**: Supports request cancellation via AbortController.
   *
   * @template TResponse - The expected type of the parsed JSON response.
   *
   * @param endpoint - The API endpoint path to append to the base URL.
   * @param config - HTTP configuration including method, headers, timeout, and retry settings.
   * @param reporter - Optional metrics reporter for observability.
   *
   * @returns HTTPResponse object containing data$, raw$, and reporter observables.
   */
  static fetch<TResponse>(
    endpoint: string,
    config: HTTPConfig,
    reporter: Reporter<OperatorReport> = new Reporter()
  ): HTTPResponse<TResponse> {
    const controller = new AbortController();

    // Create a shared observable that handles the fetch and body parsing
    const fetchAndParse$ = fromFetch(`${config.baseUrl}${endpoint}`, {
      method: config.method,
      headers: config.headers,
      signal: controller.signal,
      body: config.body ? JSON.stringify(config.body) : undefined
    }).pipe(
      switchMap(async (response) => {
        // Clone the response so we can read the body and still provide the raw response
        const responseClone = response.clone();

        if (!response.ok) {
          let errorData: any;
          let errorText: string;

          try {
            // Try to parse as JSON first
            errorData = await response.json();
            errorText = errorData.message || JSON.stringify(errorData);
          } catch (parseError) {
            // Fallback to text if JSON parsing fails
            try {
              errorText = await response.text();
              errorData = { message: errorText };
            } catch (textError) {
              errorText = `Unknown error (status: ${response.status})`;
              errorData = { message: errorText };
            }
          }

          // Create a structured error with the parsed data
          const error = new Error(`HTTP ${response.status}: ${errorText}`);
          (error as any).response = errorData;
          (error as any).status = response.status;
          (error as any).isHttpError = true; // Mark as HTTP error for retry logic

          const e = `a fetch error occurred: ${response.status}: ${errorText}`;
          // Don't increment error count here - let the retry logic handle it
          reporter.apply(set("stage", "error"), set("message", e));
          throw error;
        }

        // Parse successful response
        const jsonData = await response.json();
        reporter.apply(set("stage", "complete"));

        return {
          data: jsonData as TResponse,
          rawResponse: responseClone
        };
      }),
      /**
       * shareReplay(1) ensures that the fetch request is executed only once,
       * and the result is cached and shared with all subscribers.
       */
      shareReplay(1)
    );

    const request$ = fetchAndParse$.pipe(
      map((result) => result.data),
      retryWhen((errors) =>
        errors.pipe(
          scan((retryCount, error: any) => {
            // Only retry on network errors, timeout errors, or specific retryable HTTP status codes.
            const isRetryableError = HTTP.isRetryableError(error);

            // Always increment error count for any error that reaches here.
            reporter.apply(add("errors", 1));

            if (!isRetryableError || retryCount >= (config.retries ?? 3)) {
              // For non-retryable errors or when max retries reached, set final error state.
              reporter.apply(set("stage", "error"), set("message", error.message));
              throw error;
            }

            const backoffDelay = config.backoff ?? 500 * Math.pow(2, retryCount);
            reporter.apply(set("stage", "retry"), set("message", `retrying after ${backoffDelay}ms: ${error.message}`));
            return retryCount + 1;
          }, 0),
          delayWhen((retryCount) => timer(config.backoff ?? 500 * Math.pow(2, retryCount)))
        )
      ),
      catchError((error) => {
        // This catchError should only handle errors that escape the retry logic.
        // The error count should already be incremented in the scan operator.
        reporter.apply(set("stage", "error"), set("message", error.message));
        return throwError(() => error);
      })
    );

    const raw$ = fetchAndParse$.pipe(
      map((result) => result.rawResponse),
      catchError(() => {
        // If we can't get the raw response, create a minimal response object.
        const response = new Response(null, { status: 0, statusText: "Request failed" });
        return [response];
      })
    );

    if (config.timeout) {
      return new HTTPResponse<TResponse>(
        race(
          request$,
          timer(config.timeout).pipe(
            switchMap(() => {
              controller.abort();
              reporter.apply(
                add("errors", 1),
                set("stage", "timeout"),
                set("message", `aborted request after ${config.timeout}ms due to timeout`)
              );
              return throwError(() => new Error(`aborted request after ${config.timeout}ms due to timeout`));
            })
          )
        ),
        raw$,
        reporter,
        () => controller.abort()
      );
    }

    return new HTTPResponse<TResponse>(request$, raw$, reporter, () => controller.abort());
  }

  /**
   * Executes an HTTP GET request with comprehensive error handling, retry logic, and observability.
   *
   * This method provides access to both the parsed response data and the raw Response object
   * through separate observables. The implementation uses RxJS to handle the asynchronous
   * nature of HTTP requests while providing real-time metrics and retry capabilities.
   *
   * Key features:
   * - **Raw Response Access**: The raw$ observable provides access to the complete Response
   *   object including status codes, headers, and other metadata before JSON parsing.
   * - **Parsed Data Stream**: The data$ observable delivers the parsed JSON response or
   *   propagates errors for failed requests.
   * - **Shared Execution**: Uses shareReplay(1) to ensure the fetch request executes only
   *   once, even with multiple subscribers to both raw$ and data$ observables.
   * - **Smart Retry Logic**: Only retries on network errors, timeouts, and specific retryable
   *   HTTP status codes (502, 503, 504). Client errors (4xx) and most server errors return immediately.
   * - **Exponential Backoff**: Implements configurable retry logic with exponential backoff
   *   for transient failures.
   * - **Real-time Metrics**: Provides live observability through MetricsReporter for
   *   monitoring request lifecycle, errors, and performance.
   * - **Timeout Handling**: Supports request cancellation via AbortController.
   *
   * @template TResponse - The expected type of the parsed JSON response.
   *
   * @param endpoint - The API endpoint path to append to the base URL.
   * @param config - HTTP configuration including method, headers, timeout, and retry settings.
   *
   * @returns HTTPResponse object containing data$, raw$, and reporter observables.
   */
  static get<TResponse>(endpoint: string, config: HTTPConfig): HTTPResponse<TResponse> {
    return HTTP.fetch<TResponse>(endpoint, { ...config, method: "GET" });
  }

  /**
   * Executes an HTTP POST request with comprehensive error handling, retry logic, and observability.
   *
   * This method provides access to both the parsed response data and the raw Response object
   * through separate observables. The implementation uses RxJS to handle the asynchronous
   * nature of HTTP requests while providing real-time metrics and retry capabilities.
   *
   * Key features:
   * - **Raw Response Access**: The raw$ observable provides access to the complete Response
   *   object including status codes, headers, and other metadata before JSON parsing.
   * - **Parsed Data Stream**: The data$ observable delivers the parsed JSON response or
   *   propagates errors for failed requests.
   * - **Shared Execution**: Uses shareReplay(1) to ensure the fetch request executes only
   *   once, even with multiple subscribers to both raw$ and data$ observables.
   * - **Smart Retry Logic**: Only retries on network errors, timeouts, and specific retryable
   *   HTTP status codes (502, 503, 504). Client errors (4xx) and most server errors return immediately.
   * - **Exponential Backoff**: Implements configurable retry logic with exponential backoff
   *   for transient failures.
   * - **Real-time Metrics**: Provides live observability through MetricsReporter for
   *   monitoring request lifecycle, errors, and performance.
   * - **Timeout Handling**: Supports request cancellation via AbortController.
   *
   * @template TResponse - The expected type of the parsed JSON response.
   *
   * @param endpoint - The API endpoint path to append to the base URL.
   * @param config - HTTP configuration including method, headers, timeout, and retry settings.
   *
   * @returns HTTPResponse object containing data$, raw$, and reporter observables.
   */
  static post<TResponse>(endpoint: string, config: HTTPConfig): HTTPResponse<TResponse> {
    return HTTP.fetch<TResponse>(endpoint, { ...config, method: "POST" });
  }

  /**
   * Executes an HTTP PUT request with comprehensive error handling, retry logic, and observability.
   *
   * This method provides access to both the parsed response data and the raw Response object
   * through separate observables. The implementation uses RxJS to handle the asynchronous
   * nature of HTTP requests while providing real-time metrics and retry capabilities.
   *
   * Key features:
   * - **Raw Response Access**: The raw$ observable provides access to the complete Response
   *   object including status codes, headers, and other metadata before JSON parsing.
   * - **Parsed Data Stream**: The data$ observable delivers the parsed JSON response or
   *   propagates errors for failed requests.
   * - **Shared Execution**: Uses shareReplay(1) to ensure the fetch request executes only
   *   once, even with multiple subscribers to both raw$ and data$ observables.
   * - **Smart Retry Logic**: Only retries on network errors, timeouts, and specific retryable
   *   HTTP status codes (502, 503, 504). Client errors (4xx) and most server errors return immediately.
   * - **Exponential Backoff**: Implements configurable retry logic with exponential backoff
   *   for transient failures.
   * - **Real-time Metrics**: Provides live observability through MetricsReporter for
   *   monitoring request lifecycle, errors, and performance.
   * - **Timeout Handling**: Supports request cancellation via AbortController.
   *
   * @template TResponse - The expected type of the parsed JSON response.
   *
   * @param endpoint - The API endpoint path to append to the base URL.
   * @param config - HTTP configuration including method, headers, timeout, and retry settings.
   *
   * @returns HTTPResponse object containing data$, raw$, and reporter observables.
   */
  static put<TResponse>(endpoint: string, config: HTTPConfig): HTTPResponse<TResponse> {
    return HTTP.fetch<TResponse>(endpoint, { ...config, method: "PUT" });
  }

  /**
   * Executes an HTTP PATCH request with comprehensive error handling, retry logic, and observability.
   *
   * This method provides access to both the parsed response data and the raw Response object
   * through separate observables. The implementation uses RxJS to handle the asynchronous
   * nature of HTTP requests while providing real-time metrics and retry capabilities.
   *
   * Key features:
   * - **Raw Response Access**: The raw$ observable provides access to the complete Response
   *   object including status codes, headers, and other metadata before JSON parsing.
   * - **Parsed Data Stream**: The data$ observable delivers the parsed JSON response or
   *   propagates errors for failed requests.
   * - **Shared Execution**: Uses shareReplay(1) to ensure the fetch request executes only
   *   once, even with multiple subscribers to both raw$ and data$ observables.
   * - **Smart Retry Logic**: Only retries on network errors, timeouts, and specific retryable
   *   HTTP status codes (502, 503, 504). Client errors (4xx) and most server errors return immediately.
   * - **Exponential Backoff**: Implements configurable retry logic with exponential backoff
   *   for transient failures.
   * - **Real-time Metrics**: Provides live observability through MetricsReporter for
   *   monitoring request lifecycle, errors, and performance.
   * - **Timeout Handling**: Supports request cancellation via AbortController.
   *
   * @template TResponse - The expected type of the parsed JSON response.
   *
   * @param endpoint - The API endpoint path to append to the base URL.
   * @param config - HTTP configuration including method, headers, timeout, and retry settings.
   *
   * @returns HTTPResponse object containing data$, raw$, and reporter observables.
   */
  static delete<TResponse>(endpoint: string, config: HTTPConfig): HTTPResponse<TResponse> {
    return HTTP.fetch<TResponse>(endpoint, { ...config, method: "DELETE" });
  }

  /**
   * Executes an HTTP PATCH request with comprehensive error handling, retry logic, and observability.
   *
   * This method provides access to both the parsed response data and the raw Response object
   * through separate observables. The implementation uses RxJS to handle the asynchronous
   * nature of HTTP requests while providing real-time metrics and retry capabilities.
   *
   * Key features:
   * - **Raw Response Access**: The raw$ observable provides access to the complete Response
   *   object including status codes, headers, and other metadata before JSON parsing.
   * - **Parsed Data Stream**: The data$ observable delivers the parsed JSON response or
   *   propagates errors for failed requests.
   * - **Shared Execution**: Uses shareReplay(1) to ensure the fetch request executes only
   *   once, even with multiple subscribers to both raw$ and data$ observables.
   * - **Smart Retry Logic**: Only retries on network errors, timeouts, and specific retryable
   *   HTTP status codes (502, 503, 504). Client errors (4xx) and most server errors return immediately.
   * - **Exponential Backoff**: Implements configurable retry logic with exponential backoff
   *   for transient failures.
   * - **Real-time Metrics**: Provides live observability through MetricsReporter for
   *   monitoring request lifecycle, errors, and performance.
   * - **Timeout Handling**: Supports request cancellation via AbortController.
   *
   * @template TResponse - The expected type of the parsed JSON response.
   *
   * @param endpoint - The API endpoint path to append to the base URL.
   * @param config - HTTP configuration including method, headers, timeout, and retry settings.
   *
   * @returns HTTPResponse object containing data$, raw$, and reporter observables.
   */
  static patch<TResponse>(endpoint: string, config: HTTPConfig): HTTPResponse<TResponse> {
    return HTTP.fetch<TResponse>(endpoint, { ...config, method: "PATCH" });
  }
}
