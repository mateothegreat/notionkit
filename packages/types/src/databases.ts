import { type } from "arktype";
import { emptyObject, titleBasePropertySchema } from "./common";
import { coverSchema, iconSchema, idSchema, richTextSchema, userSchema } from "./schemas";
import type { InferredType } from "./util";

export const databasePropertiesSchema = type("Record<string, unknown>");

export type DatabaseProperties = InferredType<typeof databasePropertiesSchema>;

/**
 * Database title property schema with empty configuration object.
 * Used for defining title columns in Notion databases.
 */
export const databaseTitlePropertySchema = type({
  ...titleBasePropertySchema,
  name: "string",
  "title?": emptyObject // optional because it's not required for database properties
});

export type DatabaseTitleProperty = typeof databaseTitlePropertySchema.infer;

export const databaseParent = type({
  type: "'database'",
  database_id: idSchema
});

export type DatabaseParent = typeof databaseParent.infer;

export const databaseSchema = type({
  object: '"database"',
  id: idSchema,
  created_time: "string",
  created_by: userSchema,
  last_edited_time: "string",
  last_edited_by: userSchema,
  archived: "boolean",
  in_trash: "boolean",
  url: "string",
  "public_url?": "string | null",
  title: richTextSchema,
  description: richTextSchema,
  "icon?": iconSchema,
  "cover?": coverSchema,
  properties: databasePropertiesSchema,
  parent: databaseParent,
  is_inline: "boolean"
});

export type Database = typeof databaseSchema.infer;

/**
 * Type guard to check if an object is a database.
 *
 * @param obj - The object to check
 * @returns True if the object is a database
 *
 * @example
 * ```typescript
 * const result = await notion.databases.retrieve({ database_id: "..." });
 * if (isDatabase(result)) {
 *   // TypeScript knows result is a Database
 *   console.log(result.properties);
 * }
 * ```
 */
export function isDatabase(obj: unknown): obj is Database {
  return (
    obj !== null &&
    obj !== undefined &&
    typeof obj === "object" &&
    "object" in obj &&
    (obj as any).object === "database"
  );
}
