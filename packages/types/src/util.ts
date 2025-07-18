import type { Type } from "arktype";

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
