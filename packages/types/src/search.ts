import { type } from "arktype";
import { databasePropertySchema, pagePropertyValueSchema } from "./properties";
import { isoDateSchema, parentSchema, userSchema } from "./schemas";

export const searchSort = type({
  timestamp: isoDateSchema,
  direction: '"ascending" | "descending"'
});

export const searchFilter = type({
  property: "'object'",
  value: '"page" | "database"'
});

export const searchParameters = type({
  query: "string",
  filter: searchFilter,
  sort: searchSort,
  start_cursor: "string",
  page_size: "number"
});

export type SearchParameters = typeof searchParameters.infer;

export const searchSchema = type({
  "query?": "string",
  "filter?": searchFilter,
  "sort?": searchSort,
  "start_cursor?": "string",
  "page_size?": "number"
});

export type Search = typeof searchSchema.infer;

/**
 * Unified page or database schema for mixed result sets.
 */
export const pageOrDatabaseSchema = type({
  object: '"page" | "database"',
  id: "string",
  created_time: "string",
  last_edited_time: "string",
  archived: "boolean",
  url: "string",
  "public_url?": "string | null",
  parent: parentSchema,
  properties: type([pagePropertyValueSchema, databasePropertySchema]),
  created_by: userSchema,
  last_edited_by: userSchema
});

export type PageOrDatabase = typeof pageOrDatabaseSchema.infer;

/**
 * Base list response schema from Notion API.
 */
export const searchResponseSchema = type({
  object: '"list"',
  "next_cursor?": "string",
  has_more: "boolean",
  results: pageOrDatabaseSchema.array()
});

export type SearchResponse = typeof searchResponseSchema.infer;
