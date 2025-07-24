import { scope, type } from "arktype";

/**
 * Schema for notion id validation - supports both UUID formats.
 * Notion IDs can be either with or without dashes.
 */
export const idSchema = type("string");

/**
 * Schema for UUID validation with dashes.
 */
export const uuidSchema = type("/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/");

/**
 * Schema for ISO 8601 date strings.
 */
export const isoDateSchema = type("string");

/**
 * Schema for color values.
 */
export const colorSchema = type(
  '"default" | "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red"'
);

/**
 * Schema for text annotations.
 */
export const annotationsSchema = type({
  bold: "boolean",
  italic: "boolean",
  strikethrough: "boolean",
  underline: "boolean",
  code: "boolean",
  color: colorSchema
});

/**
 * Schema for emoji values (single Unicode character).
 */
export const emojiSchema = type("string");

/**
 * Schema for external file references.
 */
export const externalFileSchema = type({
  url: "string"
});

/**
 * Schema for internal file references.
 */
export const internalFileSchema = type({
  url: "string",
  expiry_time: isoDateSchema
});

/**
 * Create a scope for file-related schemas.
 */
const fileScope = scope({
  externalFile: {
    type: '"external"',
    external: externalFileSchema
  },
  internalFile: {
    type: '"file"',
    file: internalFileSchema
  },
  file: "externalFile | internalFile"
}).export();

/**
 * Schema for file references (internal or external).
 */
export const fileSchema = fileScope.file;

/**
 * Type representing a file reference.
 */
export type File = typeof fileSchema.infer;

/**
 * Create a scope for icon-related schemas.
 */
export const iconScope = scope({
  emojiIcon: {
    type: '"emoji"',
    emoji: emojiSchema
  },
  externalIcon: {
    type: '"external"',
    external: externalFileSchema
  },
  fileIcon: {
    type: '"file"',
    file: internalFileSchema
  },
  customEmojiIcon: {
    type: '"custom_emoji"',
    custom_emoji: {
      id: "string",
      name: "string",
      url: "string"
    }
  },
  icon: "emojiIcon | externalIcon | fileIcon | customEmojiIcon | null"
}).export();

/**
 * Schema for icon references (can be null).
 */
export const iconSchema = iconScope.icon;

/**
 * Type representing an icon.
 */
export type Icon = typeof iconSchema.infer;

/**
 * Create a scope for cover-related schemas.
 */
const coverScope = scope({
  externalCover: {
    type: '"external"',
    external: externalFileSchema
  },
  fileCover: {
    type: '"file"',
    file: internalFileSchema
  },
  cover: "externalCover | fileCover | null"
}).export();

/**
 * Schema for cover images (can be null).
 */
export const coverSchema = coverScope.cover;

/**
 * Type representing a cover image.
 */
export type Cover = typeof coverSchema.infer;

/**
 * Create a scope for text content schemas.
 */
const textScope = scope({
  linkObject: { url: "string <= 2000" },
  textContent: {
    content: "string <= 2000",
    "link?": "linkObject | null"
  }
}).export();

/**
 * Schema for plain text content.
 */
export const textContentSchema = textScope.textContent;

/**
 * Schema for rich text items.
 */
export const richTextItemSchema = type({
  type: '"text"',
  text: textContentSchema,
  annotations: annotationsSchema,
  plain_text: "string <= 2000",
  "href?": "string <= 2000 | null"
});

/**
 * Type representing a rich text item.
 */
export type RichTextItem = typeof richTextItemSchema.infer;

/**
 * Schema for rich text arrays.
 */
export const richTextSchema = richTextItemSchema.array();

/**
 * Schema for user objects.
 */
export const userSchema = type({
  object: '"user"',
  id: idSchema
});

/**
 * Type representing a user.
 */
export type User = typeof userSchema.infer;

/**
 * Schema for page mentions.
 */
export const pageMentionSchema = type({
  type: '"page"',
  page: { id: idSchema }
});

/**
 * Schema for user mentions.
 */
export const userMentionSchema = type({
  type: '"user"',
  user: { id: idSchema }
});

/**
 * Schema for date mentions.
 */
export const dateMentionSchema = type({
  type: '"date"',
  date: {
    start: isoDateSchema,
    "end?": "'isoDateSchema' | null",
    "time_zone?": "string | null"
  }
});

/**
 * Schema for database mentions.
 */
export const databaseMentionSchema = type({
  type: '"database"',
  database: { id: idSchema }
});

/**
 * Schema for link preview mentions.
 */
export const linkPreviewMentionSchema = type({
  type: '"link_preview"',
  link_preview: { url: "string" }
});

/**
 * Schema for template mentions.
 */
export const templateMentionSchema = type({
  type: '"template_mention"',
  template_mention: {
    template_mention_date: '"today" | "now"',
    template_mention_user: '"me"'
  }
});

/**
 * Union schema for all mention types.
 */
export const mentionSchema = type([
  pageMentionSchema,
  userMentionSchema,
  dateMentionSchema,
  databaseMentionSchema,
  linkPreviewMentionSchema,
  templateMentionSchema
]);
