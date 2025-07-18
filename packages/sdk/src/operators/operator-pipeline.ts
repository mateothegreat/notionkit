// import { Observable, of } from "rxjs";
// import { filter, map, scan, share } from "rxjs/operators";
// import type { SchemaLoader } from "../schemas/loader";
// import { createPaginatedStream, pipeline, StreamPipeline } from "../schemas/streaming";
// import { Operator, type NotionConfig, type OperatorResult } from "./operator";

// /**
//  * Configuration for operator pipeline.
//  */
// export interface PipelineConfig {
//   schemaLoader: SchemaLoader;
//   baseUrl?: string;
//   headers?: Record<string, string>;
//   cache?: boolean;
//   retries?: number;
// }

// /**
//  * Operator pipeline for composing and streaming operations.
//  *
//  * @example
//  * ```typescript
//  * const pipeline = new OperatorPipeline({
//  *   schemaLoader: loader,
//  *   baseUrl: 'https://api.notion.com/v1',
//  *   headers: { 'Authorization': 'Bearer ...' }
//  * });
//  *
//  * // Stream pages from a database
//  * const pages$ = pipeline
//  *   .stream(new ListDatabasePagesOperator(), { databaseId: '...' })
//  *   .pipe(
//  *     filter(page => !page.archived),
//  *     map(page => ({ id: page.id, title: getPageTitle(page) }))
//  *   );
//  * ```
//  */
// export class OperatorPipeline {
//   private context: NotionConfig;

//   constructor(private config: PipelineConfig) {
//     this.context = {
//       schemaLoader: config.schemaLoader,
//       baseUrl: config.baseUrl || "https://api.notion.com/v1",
//       headers: config.headers || {},
//       requestId: this.generateRequestId()
//     };
//   }

//   /**
//    * Execute a single operator.
//    *
//    * @param operator - The operator to execute
//    * @param request - The request payload
//    * @returns Observable of the operator result
//    */
//   execute<TRequest, TResponse>(
//     operator: Operator<TRequest, TResponse>,
//     request: TRequest
//   ): Observable<OperatorResult<TResponse>> {
//     return operator.run(request, this.context, {
//       retries: this.config.retries,
//       cache: this.config.cache
//     });
//   }

//   /**
//    * Stream results using pagination.
//    *
//    * @param operator - The operator to use for each page
//    * @param initialRequest - Initial request parameters
//    * @param getCursor - Function to extract cursor from response
//    * @returns Observable stream of individual items
//    */
//   stream<TRequest, TResponse, TItem>(
//     operator: Operator<TRequest, TResponse>,
//     initialRequest: TRequest,
//     getCursor: (response: TResponse) => string | undefined,
//     getItems: (response: TResponse) => TItem[]
//   ): Observable<TItem> {
//     return createPaginatedStream<TItem>(
//       async (cursor?: string) => {
//         const request = cursor ? { ...initialRequest, startCursor: cursor } : initialRequest;

//         const result = await operator.run(request, this.context).toPromise();

//         return {
//           data: getItems(result.data),
//           hasMore: !!getCursor(result.data),
//           nextCursor: getCursor(result.data)
//         };
//       },
//       {
//         retryCount: this.config.retries || 3,
//         retryDelay: 1000
//       }
//     );
//   }

//   /**
//    * Create a streaming pipeline with operators.
//    *
//    * @returns StreamPipeline instance for chaining operations
//    */
//   createStreamPipeline<T>(): StreamPipeline<T> {
//     return pipeline<T>();
//   }

//   /**
//    * Batch execute multiple operators in parallel.
//    *
//    * @param operations - Array of operator and request pairs
//    * @returns Observable of all results
//    */
//   batch<T extends Array<{ operator: Operator<any, any>; request: any }>>(
//     operations: T
//   ): Observable<Array<OperatorResult<any>>> {
//     const observables = operations.map(({ operator, request }) => operator.run(request, this.context));

//     return new Observable((subscriber) => {
//       const results: OperatorResult<any>[] = [];
//       let completed = 0;

//       observables.forEach((obs, index) => {
//         obs.subscribe({
//           next: (result) => {
//             results[index] = result;
//             completed++;
//             if (completed === observables.length) {
//               subscriber.next(results);
//               subscriber.complete();
//             }
//           },
//           error: (err) => subscriber.error(err)
//         });
//       });
//     });
//   }

//   /**
//    * Chain multiple operators sequentially.
//    *
//    * @param operators - Array of operators to chain
//    * @returns A composed operator
//    */
//   chain<TInitial, TFinal>(operators: Operator<any, any>[]): Operator<TInitial, TFinal> {
//     return operators.reduce((acc, operator) => acc.pipe(operator)) as any;
//   }

//   /**
//    * Execute operators with caching.
//    *
//    * @param operator - The operator to execute
//    * @param request - The request payload
//    * @param cacheKey - Unique cache key
//    * @returns Observable of the cached or fresh result
//    */
//   cached<TRequest, TResponse>(
//     operator: Operator<TRequest, TResponse>,
//     request: TRequest,
//     cacheKey: string
//   ): Observable<OperatorResult<TResponse>> {
//     // In a real implementation, you would check cache first
//     const cached = this.getFromCache<TResponse>(cacheKey);

//     if (cached) {
//       return of({
//         data: cached,
//         metadata: {
//           cached: true,
//           timestamp: new Date(),
//           requestId: this.context.requestId
//         }
//       });
//     }

//     return operator.run(request, this.context).pipe(
//       map((result) => {
//         this.setCache(cacheKey, result.data);
//         return result;
//       })
//     );
//   }

//   /**
//    * Stream with progress tracking.
//    *
//    * @param operator - The operator to stream
//    * @param request - Initial request
//    * @param options - Stream options
//    * @returns Observable with progress updates
//    */
//   streamWithProgress<TRequest, TResponse, TItem>(
//     operator: Operator<TRequest, TResponse>,
//     request: TRequest,
//     options: {
//       getCursor: (response: TResponse) => string | undefined;
//       getItems: (response: TResponse) => TItem[];
//       onProgress?: (progress: { total: number; current: number }) => void;
//     }
//   ): Observable<TItem> {
//     let total = 0;

//     return this.stream(operator, request, options.getCursor, options.getItems).pipe(
//       scan(
//         (acc, item) => {
//           acc.count++;
//           if (options.onProgress) {
//             options.onProgress({ total: acc.total, current: acc.count });
//           }
//           return acc;
//         },
//         { count: 0, total: 0 }
//       ),
//       map(() => null),
//       filter((item) => item !== null),
//       share()
//     );
//   }

//   /**
//    * Generate a unique request ID.
//    */
//   private generateRequestId(): string {
//     return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
//   }

//   /**
//    * Get from cache (stub implementation).
//    */
//   private getFromCache<T>(key: string): T | null {
//     // In a real implementation, this would check a cache store
//     return null;
//   }

//   /**
//    * Set cache (stub implementation).
//    */
//   private setCache<T>(key: string, value: T): void {
//     // In a real implementation, this would store in a cache
//   }
// }

// /**
//  * Factory function for creating pipeline instances.
//  *
//  * @param config - Pipeline configuration
//  * @returns New OperatorPipeline instance
//  */
// export function createPipeline(config: PipelineConfig): OperatorPipeline {
//   return new OperatorPipeline(config);
// }

// /**
//  * Higher-order operator for adding logging.
//  *
//  * @param operator - The operator to wrap
//  * @returns Wrapped operator with logging
//  */
// export function withLogging<TRequest, TResponse>(
//   operator: Operator<TRequest, TResponse>
// ): Operator<TRequest, TResponse> {
//   class LoggingOperator extends Operator<TRequest, TResponse> {
//     protected schemaName = (operator as any).schemaName;

//     execute(request: TRequest, context: NotionConfig): Observable<TResponse> {
//       console.log(`[${this.constructor.name}] Starting execution`, { request });

//       return operator.execute(request, context).pipe(
//         map((response) => {
//           console.log(`[${this.constructor.name}] Completed`, { response });
//           return response;
//         }),
//         catchError((error) => {
//           console.error(`[${this.constructor.name}] Failed`, { error });
//           throw error;
//         })
//       );
//     }
//   }

//   return new LoggingOperator();
// }

// /**
//  * Higher-order operator for adding metrics.
//  *
//  * @param operator - The operator to wrap
//  * @param metricsCollector - Function to collect metrics
//  * @returns Wrapped operator with metrics
//  */
// export function withMetrics<TRequest, TResponse>(
//   operator: Operator<TRequest, TResponse>,
//   metricsCollector: (metrics: { duration: number; success: boolean }) => void
// ): Operator<TRequest, TResponse> {
//   class MetricsOperator extends Operator<TRequest, TResponse> {
//     protected schemaName = (operator as any).schemaName;

//     execute(request: TRequest, context: NotionConfig): Observable<TResponse> {
//       const startTime = Date.now();

//       return operator.execute(request, context).pipe(
//         map((response) => {
//           metricsCollector({
//             duration: Date.now() - startTime,
//             success: true
//           });
//           return response;
//         }),
//         catchError((error) => {
//           metricsCollector({
//             duration: Date.now() - startTime,
//             success: false
//           });
//           throw error;
//         })
//       );
//     }
//   }

//   return new MetricsOperator();
// }
