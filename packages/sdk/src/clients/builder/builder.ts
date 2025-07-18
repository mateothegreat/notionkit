import { type, Type } from "arktype";
import { BehaviorSubject, from, Observable, of, throwError } from "rxjs";
import { concatMap, map, reduce, share, switchMap } from "rxjs/operators";
import type { Context } from "./context";
import type { QueryOperator } from "./query";

export interface SchemaRegistryType {
  register<T>(name: string, schema: Type<T>): void;
  get<T>(name: string): Type<T> | undefined;
  validate<T>(name: string, value: unknown): T;
  list(): string[];
}

export interface StreamOptions {
  bufferSize?: number;
  throttleMs?: number;
  retryCount?: number;
  retryDelay?: number;
}

/**
 * Query condition for filtering.
 */
export interface QueryCondition<T> {
  field: keyof T;
  operator: QueryOperator;
  value: any;
}

/**
 * Sort specification.
 */
export interface SortSpec<T> {
  field: keyof T;
  direction: "asc" | "desc";
}

/**
 * Raw query configuration for escape hatch scenarios.
 */
export interface RawQueryConfig {
  query: string;
  params?: any[];
  skipValidation?: boolean;
}

/**
 * Batch configuration for streaming.
 */
export interface BatchConfig {
  bufferSize: number;
  throttleMs: number;
  retryCount: number;
  retryDelay: number;
}

/**
 * Helper function to validate data with ArkType schema.
 */
export function validateWithSchema<T>(schema: Type<T>, data: unknown): Observable<T> {
  const validated = schema(data);

  // ArkType returns an array of errors for invalid data
  if (Array.isArray(validated)) {
    // This means validation failed - ArkType returns errors as an array
    const errors = validated as any[];
    const errorMessages = errors.map((err) => err.message || err.problem || "Validation error").join(", ");
    return throwError(() => new Error(`Schema validation failed: ${errorMessages}`));
  }

  return of(validated as T);
}

/**
 * Reactive query builder with RxJS observables.
 */
export class QueryBuilder<T> {
  private schemaName: string;
  private schemaRegistry: SchemaRegistryType;
  private executor: (context: Context<T>) => Observable<T[]>;
  private rawExecutor?: (config: RawQueryConfig) => Observable<T[]>;
  private schema?: Type<T>;

  private context = new BehaviorSubject<Context<T>>({
    conditions: [],
    sorts: [],
    includes: []
  });

  constructor(
    schemaName: string,
    schemaRegistry: SchemaRegistryType,
    executor: (context: Context<T>) => Observable<T[]>,
    rawExecutor?: (config: RawQueryConfig) => Observable<T[]>,
    schema?: Type<T>
  ) {
    this.schemaName = schemaName;
    this.schemaRegistry = schemaRegistry;
    this.executor = executor;
    this.rawExecutor = rawExecutor;
    this.schema = schema;
  }

  where<K extends keyof T>(field: K, operator: QueryOperator, value: T[K]): this {
    this.context.next({
      ...this.context.value,
      conditions: [...this.context.value.conditions, { field, operator, value }]
    });
    return this;
  }

  orderBy<K extends keyof T>(field: K, direction: "asc" | "desc" = "asc"): this {
    this.context.next({
      ...this.context.value,
      sorts: [...this.context.value.sorts, { field, direction }]
    });
    return this;
  }

  limit(count: number): this {
    this.context.next({
      ...this.context.value,
      limitValue: count
    });
    return this;
  }

  offset(count: number): this {
    this.context.next({
      ...this.context.value,
      offsetValue: count
    });
    return this;
  }

  include(...relations: string[]): this {
    this.context.next({
      ...this.context.value,
      includes: [...this.context.value.includes, ...relations]
    });
    return this;
  }

  select<K extends keyof T>(...fields: K[]): QueryBuilder<Pick<T, K>> {
    const newContext = {
      ...this.context.value,
      selectedFields: fields as (keyof T)[]
    };

    const executor = (ctx: Context<Pick<T, K>>): Observable<Pick<T, K>[]> => {
      const mergedContext = {
        ...newContext,
        ...ctx,
        conditions: newContext.conditions,
        selectedFields: fields as (keyof T)[]
      };

      return this.executor(mergedContext as Context<T>).pipe(
        map((results) =>
          results.map((item) => {
            const picked: any = {};
            for (const field of fields) {
              picked[field] = item[field];
            }
            return picked as Pick<T, K>;
          })
        )
      );
    };

    // Create projected schema if available
    let projectedSchema: Type<Pick<T, K>> | undefined;
    if (this.schema) {
      const schemaDefinition: any = {};
      for (const field of fields) {
        schemaDefinition[field as string] = "unknown";
      }
      projectedSchema = type(schemaDefinition) as unknown as Type<Pick<T, K>>;
    }

    const builder = new QueryBuilder<Pick<T, K>>(
      this.schemaName,
      this.schemaRegistry,
      executor,
      this.rawExecutor as any,
      projectedSchema
    );

    builder.context = newContext as any;
    return builder;
  }

  raw(query: string, params?: any[], skipValidation = false): this {
    this.context.next({
      ...this.context.value,
      rawQuery: { query, params, skipValidation }
    });
    return this;
  }

  execute(): Observable<T[]> {
    if (this.context.value.rawQuery) {
      if (!this.rawExecutor) {
        return throwError(() => new Error("Raw query executor not provided"));
      }

      const source$ = this.rawExecutor(this.context.value.rawQuery);

      return source$.pipe(
        switchMap((results) => {
          if (this.schema && !this.context.value.rawQuery?.skipValidation) {
            return from(results).pipe(
              concatMap((result) => validateWithSchema(this.schema!, result)),
              reduce((acc, validated) => [...acc, validated], [] as T[])
            );
          }
          return of(results);
        }),
        share()
      );
    }

    const source$ = this.executor(this.context.value);

    return source$.pipe(
      switchMap((results) => {
        if (this.schema) {
          return from(results).pipe(
            concatMap((result) => validateWithSchema(this.schema!, result)),
            reduce((acc, validated) => [...acc, validated], [] as T[])
          );
        }
        return of(results);
      }),
      share()
    );
  }

  /**
   * Execute the query and return just the first result.
   */
  first(): Observable<T | null> {
    if (this.context.value.rawQuery) {
      return this.execute().pipe(map((results) => (results.length > 0 ? results[0]! : null)));
    }

    const limitedContext = { ...this.context.value, limitValue: 1 };

    return this.executor(limitedContext).pipe(
      switchMap((results) => {
        if (results.length === 0) {
          return of(null);
        }

        const result = results[0]!; // Non-null assertion since we checked length > 0

        if (this.schema) {
          return validateWithSchema(this.schema, result).pipe(map((validated) => validated as T));
        }

        return of(result);
      }),
      share()
    );
  }

  /**
   * Count matching records.
   */
  count(): Observable<number> {
    if (this.context.value.rawQuery) {
      return this.execute().pipe(map((results) => results.length));
    }

    // In a real implementation, this would execute a count query
    // For now, we'll execute the full query and count results
    return this.execute().pipe(map((results) => results.length));
  }

  /**
   * Get the current query context as an observable.
   */
  getContext(): Observable<Context<T>> {
    return this.context.asObservable();
  }

  /**
   * Get the current schema for validation (if available).
   */
  getSchema(): Type<T> | undefined {
    return this.schema;
  }

  /**
   * Compose this query with another observable.
   */
  compose<R>(operator: (source: Observable<T[]>) => Observable<R>): Observable<R> {
    return this.execute().pipe(operator);
  }

  /**
   * Transform each result item.
   */
  map<R>(transform: (item: T) => R): Observable<R[]> {
    return this.execute().pipe(map((results) => results.map(transform)));
  }

  /**
   * Filter results.
   */
  filter(predicate: (item: T) => boolean): Observable<T[]> {
    return this.execute().pipe(map((results) => results.filter(predicate)));
  }

  /**
   * Take only the first n results.
   */
  take(count: number): Observable<T[]> {
    return this.execute().pipe(map((results) => results.slice(0, count)));
  }

  /**
   * Skip the first n results.
   */
  skip(count: number): Observable<T[]> {
    return this.execute().pipe(map((results) => results.slice(count)));
  }

  /**
   * Convert to a hot observable that shares the execution.
   */
  hot(): Observable<T[]> {
    return this.execute().pipe(share());
  }

  /**
   * Convert to a cold observable (default behavior).
   */
  cold(): Observable<T[]> {
    return this.execute();
  }
}
