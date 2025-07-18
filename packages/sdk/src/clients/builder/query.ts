import { Observable } from "rxjs";
import type { StreamOptions } from "./builder";

/**
 * Query builder interface for type-safe queries.
 */
export interface QueryBuilder<T> {
  where<K extends keyof T>(field: K, operator: QueryOperator, value: T[K]): this;
  orderBy<K extends keyof T>(field: K, direction?: "asc" | "desc"): this;
  limit(count: number): this;
  offset(count: number): this;
  include(...relations: string[]): this;
  select<K extends keyof T>(...fields: K[]): QueryBuilder<Pick<T, K>>;
  stream(options?: StreamOptions): Observable<T>;
  execute(): Promise<T[]>;
  first(): Promise<T | null>;
  count(): Promise<number>;
}

/**
 * Query operators for filtering.
 */
export enum QueryOperator {
  Equals = "=",
  NotEquals = "!=",
  GreaterThan = ">",
  GreaterThanOrEqual = ">=",
  LessThan = "<",
  LessThanOrEqual = "<=",
  Contains = "contains",
  StartsWith = "starts_with",
  EndsWith = "ends_with",
  In = "in",
  NotIn = "not_in",
  IsNull = "is_null",
  IsNotNull = "is_not_null"
}

/**
 * Cache strategy for API responses.
 */
export interface CacheStrategy {
  key: (params: any) => string;
  ttl?: number;
  invalidate?: (params: any) => string[];
}
