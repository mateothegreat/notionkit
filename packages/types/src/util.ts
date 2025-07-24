import type { Type } from "arktype";
import type { Block } from "./blocks";
import type { Database } from "./databases";
import type { PropertyItem, PropertyListResponse } from "./operations/get";
import type { Page } from "./pages";

/**
 * Utility type to infer the TypeScript type from an ArkType schema.
 * This allows us to derive static types from runtime schemas.
 *
 * @template T - The ArkType schema to infer from
 *
 * @example
 * ```typescript
 * const userSchema = type({ name: "string", age: "number" });
 * type User = InferredType<typeof userSchema>;
 * // User is { name: string; age: number }
 * ```
 */
export type InferredType<T extends Type> = T extends Type<infer U> ? U : never;

/**
 * Utility function for exhaustive type checking.
 * This function ensures all cases in a union type are handled.
 * TypeScript will error if not all cases are covered.
 *
 * @param value - The value that should never be reached
 * @throws {Error} Always throws an error with the unexpected value
 *
 * @example
 * ```typescript
 * type Status = "pending" | "approved" | "rejected";
 *
 * function handleStatus(status: Status) {
 *   switch (status) {
 *     case "pending":
 *       return "Waiting...";
 *     case "approved":
 *       return "Success!";
 *     case "rejected":
 *       return "Failed";
 *     default:
 *       return arkToNever(status); // TypeScript error if a case is missed
 *   }
 * }
 * ```
 */
export const arkToNever = (value: never): never => {
  throw new Error(`Unexpected value: ${value}`);
};

export const isDatabaseResponse = (response: unknown): response is Database => {
  return response !== null && typeof response === "object" && "object" in response && response.object === "database";
};

export const isPageResponse = (response: unknown): response is Page => {
  return response !== null && typeof response === "object" && "object" in response && response.object === "page";
};

export const isBlockResponse = (response: unknown): response is Block => {
  return response !== null && typeof response === "object" && "object" in response && response.object === "block";
};

export const isPropertyItemResponse = (response: unknown): response is PropertyItem => {
  return (
    response !== null && typeof response === "object" && "object" in response && response.object === "property_item"
  );
};

export const isPropertyListResponse = (response: unknown): response is PropertyListResponse => {
  return (
    response !== null &&
    typeof response === "object" &&
    "object" in response &&
    response.object === "list" &&
    "results" in response
  );
};

export const isPaginatedPropertyType = (type: string): boolean => {
  return ["title", "rich_text", "relation", "people"].includes(type);
};
