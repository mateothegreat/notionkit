import type { GetRequest, GetResponse } from "@mateothegreat/notionkit-types/operations/get";
import { set } from "@mateothegreat/ts-kit/observability/metrics/operations";
import type { Reporter } from "@mateothegreat/ts-kit/observability/metrics/reporter";
import { EMPTY, Subject, takeUntil, tap } from "rxjs";
import type { OperatorConfig, OperatorReport } from "../operators/operator";
import { HTTP } from "../util/http/client";
import type { HTTPConfig } from "../util/http/config";
import { HTTPResponse } from "../util/http/response";
import type { GetRunner } from "./runner";

export class SingleResourceRunner<T extends "page" | "database" | "block"> implements GetRunner<T> {
  constructor(private endpointPrefix: T) {}

  run(
    request: Extract<GetRequest, { resource: T }>,
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
