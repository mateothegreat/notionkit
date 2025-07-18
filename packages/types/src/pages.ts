import { type } from "arktype";
import { richTextArraySchema } from "./blocks";
import { titleBasePropertySchema } from "./common";
import { coverSchema, iconSchema, idSchema, parentSchema, userSchema } from "./schemas";
import { type InferredType } from "./util";

export const pagePropertiesSchema = type("Record<string, unknown>");

export type PageProperties = InferredType<typeof pagePropertiesSchema>;

/**
 * Page title property value schema containing rich text content.
 * Used for actual title values in Notion pages.
 */
export const pageTitlePropertyValueSchema = type({
  ...titleBasePropertySchema,
  type: '"title"',
  title: richTextArraySchema
});

export type PageTitlePropertyValue = typeof pageTitlePropertyValueSchema.infer;

export const pageSchema = type({
  object: '"page"',
  id: idSchema,
  created_time: "string",
  created_by: userSchema,
  last_edited_time: "string",
  last_edited_by: userSchema,
  archived: "boolean",
  "icon?": iconSchema,
  "cover?": coverSchema,
  properties: pagePropertiesSchema,
  parent: parentSchema,
  url: "string",
  "public_url?": "string"
});

export type Page = typeof pageSchema.infer;

export const fullPageSchema = type({
  id: idSchema,
  object: '"page"',
  created_time: "string",
  created_by: userSchema,
  last_edited_time: "string",
  last_edited_by: userSchema,
  archived: "boolean",
  "icon?": iconSchema,
  "cover?": coverSchema,
  properties: pagePropertiesSchema,
  parent: parentSchema,
  url: "string",
  "public_url?": "string",
  content: "unknown[]" // Array of blocks - we'll use block schemas when implemented
});

export type FullPage = InferredType<typeof fullPageSchema>;
