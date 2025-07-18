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
export function arkToNever(value: never): never {
  throw new Error(`Unexpected value: ${value}`);
}
/**
 * Template literal function to wrap values in double quotes for ArkType schemas.
 * Supports all ArkType primitive types and provides clean syntax for creating quoted literals.
 *
 * @param strings - The template literal strings array.
 * @param values - The interpolated values (strings, numbers, booleans, etc).
 *
 * @returns The quoted string with interpolated values, properly formatted for ArkType.
 *
 * @example
 * ```typescript
 * // String literals
 * const userType = quote`user`;
 * // returns: "user"
 *
 * // Dynamic string interpolation
 * const dynamicType = "database";
 * const quotedType = quote`${dynamicType}`;
 * // returns: "database"
 *
 * // Number interpolation
 * const maxLength = 100;
 * const constraint = quote`string<=${maxLength}`;
 * // returns: "string<=100"
 *
 * // Boolean interpolation
 * const isRequired = true;
 * const boolType = quote`${isRequired}`;
 * // returns: "true"
 *
 * // Complex type expressions
 * const fieldName = "email";
 * const fieldType = "string";
 * const schema = quote`${fieldName}: ${fieldType}`;
 * // returns: "email: string"
 * ```
 */
export const quote = (
  strings: TemplateStringsArray,
  ...values: (string | number | boolean | bigint | null | undefined)[]
): `"${string}"` => {
  const result = strings.reduce((acc, str, i) => {
    const value = values[i];
    let interpolatedValue = "";

    if (value !== undefined && value !== null) {
      if (typeof value === "string") {
        interpolatedValue = value;
      } else if (typeof value === "number" || typeof value === "bigint") {
        interpolatedValue = value.toString();
      } else if (typeof value === "boolean") {
        interpolatedValue = value.toString();
      } else {
        interpolatedValue = String(value);
      }
    }

    return acc + str + interpolatedValue;
  }, "");

  return `"${result}"` as const;
};
