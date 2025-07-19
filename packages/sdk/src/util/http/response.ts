import type { Reporter } from "@mateothegreat/ts-kit/observability/metrics/reporter";
import { Observable } from "rxjs";
import type { OperatorReport } from "../../operators/operator";

/**
 * The response returned by the HTTP client for a given request.
 */
export class HTTPResponse<TResponse> {
  /**
   * The observable of the parsed response data.
   */
  readonly data$: Observable<TResponse>;

  /**
   * The observable of the raw response.
   */
  readonly raw$: Observable<Response>;

  /**
   * The metrics reporter.
   */
  readonly reporter: Reporter<OperatorReport>;

  /**
   * The cancel function.
   */
  readonly cancel?: () => void;

  /**
   * Creates a new HTTPResponse.
   *
   * @param data$ - The observable of the parsed response data.
   * @param raw$ - The observable of the raw response.
   * @param reporter - The metrics reporter for the request.
   * @param cancel - The function that can cancel the request.
   */
  constructor(
    data$: Observable<TResponse>,
    raw$: Observable<Response>,
    reporter: Reporter<OperatorReport>,
    cancel?: () => void
  ) {
    this.data$ = data$;
    this.raw$ = raw$;
    this.reporter = reporter;
    this.cancel = cancel;
  }
}
