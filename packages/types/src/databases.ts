import { type } from "arktype";
import type { BlockId, DatabaseId, PageId } from "./brands";
import { emptyObject, titleBasePropertySchema } from "./common";
import { coverSchema, iconSchema, idSchema, parentSchema, userSchema } from "./schemas";
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
  title: type("unknown[]"),
  description: type("unknown[]"),
  "icon?": iconSchema,
  "cover?": coverSchema,
  properties: databasePropertiesSchema,
  parent: parentSchema,
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

/**
 * Get the parent type of a database.
 *
 * @param database - The database to check
 * @returns The parent type
 *
 * @example
 * ```typescript
 * const database = await notion.databases.retrieve({ database_id: "..." });
 * if (getDatabaseParentType(database) === "page_id") {
 *   console.log("This database is in a page");
 * }
 * ```
 */
export function getDatabaseParentType(database: Database): "workspace" | "page_id" | "database_id" | "block_id" {
  return database.parent.type;
}

/**
 * Get the parent ID of a database (if it has one).
 *
 * @param database - The database to check
 * @returns The parent ID or null if parent is workspace
 *
 * @example
 * ```typescript
 * const database = await notion.databases.retrieve({ database_id: "..." });
 * const parentId = getDatabaseParentId(database);
 * if (parentId) {
 *   console.log(`Parent ID: ${parentId}`);
 * }
 * ```
 */
export function getDatabaseParentId(database: Database): PageId | DatabaseId | BlockId | null {
  const parent = database.parent;
  switch (parent.type) {
    case "page_id":
      return parent.page_id as PageId;
    case "database_id":
      return parent.database_id as DatabaseId;
    case "block_id":
      return parent.block_id as BlockId;
    case "workspace":
      return null;
    default:
      // This should never happen with proper typing
      throw new Error(`Unknown parent type: ${(parent as any).type}`);
  }
}
