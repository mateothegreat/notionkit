import { type } from "arktype";

/**
 * Enum for the different types of resources that can be retrieved.
 */
export const resourceType = type('"database" | "page" | "property" | "block"');
export type ResourceType = typeof resourceType.infer;
