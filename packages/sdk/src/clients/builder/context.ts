import type { QueryCondition, RawQueryConfig, SortSpec } from "./builder";

/**
 * Query execution context.
 */
export interface Context<T> {
  conditions: QueryCondition<T>[];
  sorts: SortSpec<T>[];
  limitValue?: number;
  offsetValue?: number;
  includes: string[];
  selectedFields?: (keyof T)[];
  rawQuery?: RawQueryConfig;
}
