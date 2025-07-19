import { type } from "arktype";
import { blockSchema } from "../blocks";
import { databaseSchema } from "../databases";
import { pageSchema } from "../pages";

/**
 * Enum for the different types of resources that can be retrieved.
 */
export const getResourceType = type('"database" | "page" | "property" | "block"');
export type GetResourceType = typeof getResourceType.infer;

/**
 * Base get request with resource type and ID.
 */
export const getRequestBase = type({
  resource: getResourceType,
  id: "string"
});

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

/**
 * Unified get request that handles all resource types.
 */
export const getRequest = getRequestBase.or(getPropertyRequest);
export type GetRequest = typeof getRequest.infer;

/**
 * Property item object returned in property responses.
 */
export const propertyItemSchema = type({
  object: '"property_item"',
  id: "string",
  type: "string",
  "[string]": "unknown" // Dynamic property based on type
});

export type PropertyItem = typeof propertyItemSchema.infer;

/**
 * Paginated property response for rich_text, relation, people, and title properties.
 */
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

/**
 * Union type for all possible get responses.
 */
export const getResponseSchema = databaseSchema
  .or(pageSchema)
  .or(blockSchema)
  .or(propertyItemSchema)
  .or(propertyListResponseSchema);

export type GetResponse = typeof getResponseSchema.infer;

/**
 * Type guards for response types.
 */
export function isDatabaseResponse(response: unknown): response is typeof databaseSchema.infer {
  return response !== null && typeof response === "object" && "object" in response && response.object === "database";
}

export function isPageResponse(response: unknown): response is typeof pageSchema.infer {
  return response !== null && typeof response === "object" && "object" in response && response.object === "page";
}

export function isBlockResponse(response: unknown): response is typeof blockSchema.infer {
  return response !== null && typeof response === "object" && "object" in response && response.object === "block";
}

export function isPropertyItemResponse(response: unknown): response is PropertyItem {
  return (
    response !== null && typeof response === "object" && "object" in response && response.object === "property_item"
  );
}

export function isPropertyListResponse(response: unknown): response is PropertyListResponse {
  return (
    response !== null &&
    typeof response === "object" &&
    "object" in response &&
    response.object === "list" &&
    "results" in response
  );
}

/**
 * Helper to determine if a property type supports pagination.
 */
export function isPaginatedPropertyType(type: string): boolean {
  return ["title", "rich_text", "relation", "people"].includes(type);
}

/**
 * Configuration for get operations.
 */
export const getConfigSchema = type({
  "includeChildren?": "boolean", // For blocks, whether to include children
  "filterArchived?": "boolean", // Whether to filter out archived items
  "propertyOptions?": {
    "page_size?": "number", // For paginated properties
    "start_cursor?": "string"
  }
});

export type GetConfig = typeof getConfigSchema.infer;
