import { type } from "arktype";

/**
 * API error schema for structured error handling.
 */
export const apiErrorResponseSchema = type({
  code: "string",
  message: "string",
  "details?": "unknown"
});

export type APIErrorResponse = typeof apiErrorResponseSchema.infer;

/**
 * Base response metadata schema for all Notion API responses.
 */
export const apiResponseMetadataSchema = type({
  "request_id?": "string",
  "timestamp?": "Date",
  "rate_limit?": type({
    remaining: "number",
    reset_time: "Date",
    "retry_after?": "number"
  }),
  "cached?": "boolean"
});

export type APIResponseMetadata = typeof apiResponseMetadataSchema.infer;
