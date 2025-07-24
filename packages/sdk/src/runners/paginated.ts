import type { GetRequest, GetResponse, PropertyListResponse } from "@mateothegreat/notionkit-types/operations/get";
import { add, set } from "@mateothegreat/ts-kit/observability/metrics/operations";
import { Reporter } from "@mateothegreat/ts-kit/observability/metrics/reporter";
import { EMPTY, Subject, defer, expand, takeUntil, tap } from "rxjs";
import type { OperatorConfig, OperatorReport } from "../operators/operator";
import { HTTP } from "../util/http/client";
import type { HTTPConfig } from "../util/http/config";
import { HTTPResponse } from "../util/http/response";
import type { GetRunner } from "./runner";

export class PaginatedPropertyRunner implements GetRunner {
  run(
    request: Extract<GetRequest, { resource: "property" }> & { property_id: string },
    http: HTTPConfig,
    config: OperatorConfig,
    reporter?: Reporter<OperatorReport>,
    cancel$?: Subject<void>
  ): HTTPResponse<GetResponse> {
    if (!reporter) {
      reporter = new Reporter<OperatorReport>();
    }

    if (!cancel$) {
      cancel$ = new Subject<void>();
    }

    const fetchPage = () =>
      HTTP.get<PropertyListResponse>(`/pages/${request.id}/properties/${request.property_id}`, http);

    const initial = fetchPage();

    return new HTTPResponse(
      defer(() => initial.data$).pipe(
        takeUntil(cancel$ ?? EMPTY),
        expand((response) => {
          if (
            !response.has_more ||
            !response.next_cursor ||
            (config.limits?.results && response.results.length >= config.limits.results)
          ) {
            reporter?.apply(set("stage", "complete"));
            return EMPTY;
          }

          reporter?.apply(set("stage", "paginate"));

          return HTTP.get<PropertyListResponse>(
            `/pages/${request.id}/properties/${request.property_id}?start_cursor=${response.next_cursor}`,
            http
          ).data$.pipe(tap((next) => reporter?.apply(add("items", next.results.length))));
        })
      ),
      initial.raw$,
      reporter,
      () => cancel$?.next()
    );
  }
}
