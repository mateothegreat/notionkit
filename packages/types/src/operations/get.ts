import { type } from "arktype";
import { blockSchema, type Block } from "../blocks";
import { databaseSchema, type Database } from "../databases";
import { pageSchema, type Page } from "../pages";

/**
 * Enum for the different types of resources that can be retrieved.
 */
export const getSingleResourceType = type('"database" | "page" | "block"');
export const getResourceType = getSingleResourceType.or(type('"property"'));
export type GetResourceType = typeof getResourceType.infer;

/**
 * Base get request for single resources.
 */
export const getRequestBase = type({
  resource: getSingleResourceType,
  id: "string"
});
export type GetRequestBase = typeof getRequestBase.infer;

/**
 * Get request for page properties which requires additional property ID.
 */
export const getPropertyRequest = type({
  resource: '"property"',
  id: "string",
  property_id: "string",
  "page_size?": "number",
  "start_cursor?": "string"
});
export type GetPropertyRequest = typeof getPropertyRequest.infer;

export const getRequest = getRequestBase.or(getPropertyRequest);
export type GetRequest = typeof getRequest.infer;

export const propertyItemSchema = type({
  object: '"property_item"',
  id: "string",
  type: "string",
  "[string]": "unknown" // Dynamic property based on type
});

export type PropertyItem = typeof propertyItemSchema.infer;

export const getPageResponseSchema = pageSchema;

export type GetPageResponse = typeof getPageResponseSchema.infer;

export const propertyListResponseSchema = type({
  object: '"list"',
  results: propertyItemSchema.array(),
  "next_cursor?": ["string", "|", "null"],
  has_more: "boolean",
  "next_url?": ["string", "|", "null"],
  "property_item?": {
    id: "string",
    "next_url?": ["string", "|", "null"],
    type: "string",
    "[string]": "unknown"
  }
});

export type PropertyListResponse = typeof propertyListResponseSchema.infer;

export const getResponseSchema = databaseSchema
  .or(pageSchema)
  .or(blockSchema)
  .or(propertyItemSchema)
  .or(propertyListResponseSchema);

export type GetResponseUnion = typeof getResponseSchema.infer;

export type GetResult<T extends GetRequest> = T extends GetPropertyRequest
  ? PropertyListResponse
  : T extends GetRequestBase
    ? T["resource"] extends "page"
      ? Page
      : T["resource"] extends "database"
        ? Database
        : T["resource"] extends "block"
          ? Block
          : never
    : never;

export type GetResponse<T extends GetResourceType = GetResourceType> = T extends "database"
  ? Database
  : T extends "page"
    ? Page
    : T extends "block"
      ? Block
      : T extends "property"
        ? PropertyItem | PropertyListResponse
        : GetResponseUnion;

export type SingleResourceResponse<T extends Exclude<GetResourceType, "property">> = T extends "database"
  ? Database
  : T extends "page"
    ? Page
    : T extends "block"
      ? Block
      : never;
