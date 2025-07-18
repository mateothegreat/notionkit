import type { Type } from "arktype";
import { concatMap, from, map, reduce, switchMap, type Observable } from "rxjs";
import type { RawQueryConfig, SchemaRegistryType } from "../builder";
import { QueryBuilder } from "../builder";
import type { Context } from "../context";

/**
 * Factory function to create a reactive query builder.
 */
export function createQueryBuilder<T>(
  schemaName: string,
  schemaRegistry: SchemaRegistryType,
  executor: (context: Context<T>) => Observable<T[]>,
  rawExecutor?: (config: RawQueryConfig) => Observable<T[]>,
  schema?: Type<T>
): QueryBuilder<T> {
  return new QueryBuilder<T>(schemaName, schemaRegistry, executor, rawExecutor, schema);
}

/**
 * Utility functions for common query patterns.
 */
export const QueryUtils = {
  and<T>(...queries: Observable<T[]>[]): Observable<T[]> {
    return from(queries).pipe(
      concatMap((query) => query),
      reduce((acc, results) => {
        if (acc.length === 0) return results;
        return acc.filter((item) => results.some((result) => JSON.stringify(item) === JSON.stringify(result)));
      }, [] as T[])
    );
  },

  /**
   * Combine multiple queries with OR logic.
   */
  or<T>(...queries: Observable<T[]>[]): Observable<T[]> {
    return from(queries).pipe(
      concatMap((query) => query),
      reduce((acc, results) => {
        const combined = [...acc];
        results.forEach((result) => {
          if (!combined.some((item) => JSON.stringify(item) === JSON.stringify(result))) {
            combined.push(result);
          }
        });
        return combined;
      }, [] as T[])
    );
  },

  /**
   * Paginate results.
   */
  paginate<T>(source: Observable<T[]>, pageSize: number, pageNumber: number): Observable<T[]> {
    return source.pipe(
      map((results) => {
        const start = (pageNumber - 1) * pageSize;
        const end = start + pageSize;
        return results.slice(start, end);
      })
    );
  },

  /**
   * Batch process results.
   */
  batch<T, R>(source: Observable<T[]>, batchSize: number, processor: (batch: T[]) => Observable<R[]>): Observable<R[]> {
    return source.pipe(
      switchMap((results) => {
        const batches: T[][] = [];
        for (let i = 0; i < results.length; i += batchSize) {
          batches.push(results.slice(i, i + batchSize));
        }

        return from(batches).pipe(
          concatMap((batch) => processor(batch)),
          reduce((acc, batchResults) => [...acc, ...batchResults], [] as R[])
        );
      })
    );
  }
};
