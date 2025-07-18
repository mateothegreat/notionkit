import { scope, type } from "arktype";

/**
 * Schema for notion id validation.
 */
export const idSchema = type("/^(.{8})(.{4})(.{4})(.{4})(.{12})$/");

/**
 * Schema for UUID validation.
 */
export const uuidSchema = type("/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/");

/**
 * Schema for ISO 8601 date strings.
 */
export const isoDateSchema = type("/^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(\\.\\d{3})?Z?$/");

/**
 * Schema for colors.
 */
export const colorSchema = type(
  '"default" | "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red" | "gray_background" | "brown_background" | "orange_background" | "yellow_background" | "green_background" | "blue_background" | "purple_background" | "pink_background" | "red_background"'
);

/**
 * Type representing colors.
 */
export type Color = typeof colorSchema.infer;

/**
 * Schema for emoji strings.
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
  icon: "emojiIcon | externalIcon | fileIcon | customEmojiIcon"
}).export();

/**
 * Schema for icon references.
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
  cover: "externalCover | fileCover"
}).export();

/**
 * Schema for cover images.
 */
export const coverSchema = coverScope.cover;

/**
 * Type representing a cover image.
 */
export type Cover = typeof coverSchema.infer;

/**
 * Create a scope for parent-related schemas.
 */
const parentScope = scope({
  databaseParent: {
    type: '"database_id"',
    database_id: "string"
  },
  pageParent: {
    type: '"page_id"',
    page_id: "string"
  },
  workspaceParent: {
    type: '"workspace"',
    workspace: "true"
  },
  blockParent: {
    type: '"block_id"',
    block_id: "string"
  },
  parent: "databaseParent | pageParent | workspaceParent | blockParent"
}).export();
/**
 * Schema for parent references.
 */
export const parentSchema = parentScope.parent;

/**
 * Type representing a parent reference.
 */
export type Parent = typeof parentSchema.infer;

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
 * Type representing text annotations.
 */
export type Annotations = typeof annotationsSchema.infer;

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
 * Schema for arrays of rich text items.
 */
export const richTextSchema = type([richTextItemSchema, "[]"]);

/**
 * Type representing rich text content.
 */
export type RichText = typeof richTextSchema.infer;

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
 * Schema for user mentions.
 */
export const userMentionSchema = type({
  type: '"user"',
  user: {
    object: '"user"',
    id: idSchema
  }
});

/**
 * Schema for page mentions.
 */
export const pageMentionSchema = type({
  type: '"page"',
  page: { id: idSchema }
});

/**
 * Schema for database mentions.
 */
export const databaseMentionSchema = type({
  type: '"database"',
  database: { id: idSchema }
});

/**
 * Schema for date mentions.
 */
export const dateMentionSchema = type({
  type: '"date"',
  date: {
    start: isoDateSchema,
    "end?": "string | null",
    "time_zone?": "string | null"
  }
});

/**
 * Create a scope for mention-related schemas.
 */
const mentionScope = scope({
  userMention: userMentionSchema,
  pageMention: pageMentionSchema,
  databaseMention: databaseMentionSchema,
  dateMention: dateMentionSchema,
  mentionItem: "userMention | pageMention | databaseMention | dateMention"
}).export();

/**
 * Schema for mention items.
 */
export const mentionItemSchema = mentionScope.mentionItem;

/**
 * Type representing a mention.
 */
export type MentionItem = typeof mentionItemSchema.infer;
