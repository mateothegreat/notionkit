import { type } from "arktype";
import { richTextArraySchema } from "./blocks";
import { titleBasePropertySchema } from "./common";
import { coverSchema, iconSchema, idSchema, userSchema } from "./schemas";
import { type InferredType } from "./util";

export const pageParent = type({
  type: "'database_id'",
  database_id: idSchema
})
  .or({
    type: "'page_id'",
    page_id: idSchema
  })
  .or({
    type: "'workspace'",
    workspace: "true"
  })
  .or({
    type: "'block_id'",
    block_id: idSchema
  });

export type PageParent = typeof pageParent.infer;

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
  in_trash: "boolean",
  "icon?": iconSchema,
  "cover?": coverSchema,
  properties: pagePropertiesSchema,
  parent: pageParent,
  url: "string",
  "public_url?": "string | null"
});

export type Page = typeof pageSchema.infer;
