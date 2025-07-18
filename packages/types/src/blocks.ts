import { type } from "arktype";
import { colorSchema, fileSchema, iconSchema, isoDateSchema } from "./schemas";

/**
 * Rich text schema with validation for content and link URL limits.
 * Ensures text content does not exceed 2000 characters and link URLs do not exceed 2000 characters.
 */
const richTextSchema = type({
  type: '"text" | "mention" | "equation"',
  "text?": {
    content: "string<=2000",
    "link?": [{ url: "string<=2000" }, "|", "null"]
  },
  "mention?": "unknown",
  "equation?": {
    expression: "string<=1000"
  },
  annotations: {
    bold: "boolean",
    italic: "boolean",
    strikethrough: "boolean",
    underline: "boolean",
    code: "boolean",
    color: colorSchema
  },
  plain_text: "string",
  "href?": "string|null"
});

/**
 * Array of rich text objects with maximum 100 elements limit.
 */
export const richTextArraySchema = richTextSchema.array().atMostLength(100);

/**
 * URL schema with 2000 character limit.
 */
const urlSchema = type("string<=2000");

/**
 * Email schema with 200 character limit.
 */
const emailSchema = type("string<=200");

/**
 * Phone number schema with 200 character limit.
 */
const phoneSchema = type("string<=200");

const baseBlock = {
  id: "string",
  object: '"block"' as const,
  created_time: isoDateSchema,
  created_by: {
    object: '"user"' as const,
    id: "string"
  },
  last_edited_time: isoDateSchema,
  last_edited_by: {
    object: '"user"' as const,
    id: "string"
  },
  has_children: "boolean",
  archived: "boolean",
  "parent?": {
    type: '"page_id" | "block_id" | "database_id" | "workspace"',
    "page_id?": "string",
    "block_id?": "string",
    "database_id?": "string",
    "workspace?": "boolean"
  }
} as const;

export const paragraphBlockSchema = type({
  ...baseBlock,
  type: '"paragraph"',
  paragraph: {
    rich_text: richTextArraySchema,
    color: colorSchema
  }
});

export type ParagraphBlock = typeof paragraphBlockSchema.infer;

export const heading1BlockSchema = type({
  ...baseBlock,
  type: '"heading_1"',
  heading_1: {
    rich_text: richTextArraySchema,
    color: colorSchema,
    is_toggleable: "boolean"
  }
});

export type Heading1Block = typeof heading1BlockSchema.infer;

export const heading2BlockSchema = type({
  ...baseBlock,
  type: '"heading_2"',
  heading_2: {
    rich_text: richTextArraySchema,
    color: colorSchema,
    is_toggleable: "boolean"
  }
});

export type Heading2Block = typeof heading2BlockSchema.infer;

export const heading3BlockSchema = type({
  ...baseBlock,
  type: '"heading_3"',
  heading_3: {
    rich_text: richTextArraySchema,
    color: colorSchema,
    is_toggleable: "boolean"
  }
});

export type Heading3Block = typeof heading3BlockSchema.infer;

export const bulletedListItemBlockSchema = type({
  ...baseBlock,
  type: '"bulleted_list_item"',
  bulleted_list_item: {
    rich_text: richTextArraySchema,
    color: colorSchema
  }
});

export type BulletedListItemBlock = typeof bulletedListItemBlockSchema.infer;

export const numberedListItemBlockSchema = type({
  ...baseBlock,
  type: '"numbered_list_item"',
  numbered_list_item: {
    rich_text: richTextArraySchema,
    color: colorSchema
  }
});

export type NumberedListItemBlock = typeof numberedListItemBlockSchema.infer;

export const toDoBlockSchema = type({
  ...baseBlock,
  type: '"to_do"',
  to_do: {
    rich_text: richTextArraySchema,
    checked: "boolean",
    color: colorSchema
  }
});

export type TodoBlock = typeof toDoBlockSchema.infer;

export const toggleBlockSchema = type({
  ...baseBlock,
  type: '"toggle"',
  toggle: {
    rich_text: richTextArraySchema,
    color: colorSchema
  }
});

export type ToggleBlock = typeof toggleBlockSchema.infer;

export const codeBlockSchema = type({
  ...baseBlock,
  type: '"code"',
  code: {
    rich_text: richTextArraySchema,
    caption: richTextArraySchema,
    language: "string"
  }
});

export type CodeBlock = typeof codeBlockSchema.infer;

export const childPageBlockSchema = type({
  ...baseBlock,
  type: '"child_page"',
  child_page: {
    title: "string"
  }
});

export type ChildPageBlock = typeof childPageBlockSchema.infer;

export const childDatabaseBlockSchema = type({
  ...baseBlock,
  type: '"child_database"',
  child_database: {
    title: "string"
  }
});

export type ChildDatabaseBlock = typeof childDatabaseBlockSchema.infer;

export const embedBlockSchema = type({
  ...baseBlock,
  type: '"embed"',
  embed: {
    "url?": urlSchema,
    "caption?": richTextArraySchema
  }
});

export type EmbedBlock = typeof embedBlockSchema.infer;

export const imageBlockSchema = type({
  ...baseBlock,
  type: '"image"',
  image: fileSchema
});

export type ImageBlock = typeof imageBlockSchema.infer;

export const videoBlockSchema = type({
  ...baseBlock,
  type: '"video"',
  video: fileSchema
});

export type VideoBlock = typeof videoBlockSchema.infer;

export const fileBlockSchema = type({
  ...baseBlock,
  type: '"file"',
  file: fileSchema
});

export type FileBlock = typeof fileBlockSchema.infer;

export const pdfBlockSchema = type({
  ...baseBlock,
  type: '"pdf"',
  pdf: fileSchema
});

export type PdfBlock = typeof pdfBlockSchema.infer;

export const audioBlockSchema = type({
  ...baseBlock,
  type: '"audio"',
  audio: fileSchema
});

export type AudioBlock = typeof audioBlockSchema.infer;

export const bookmarkBlockSchema = type({
  ...baseBlock,
  type: '"bookmark"',
  bookmark: {
    url: urlSchema,
    "caption?": richTextArraySchema
  }
});

export type BookmarkBlock = typeof bookmarkBlockSchema.infer;

export const calloutBlockSchema = type({
  ...baseBlock,
  type: '"callout"',
  callout: {
    rich_text: richTextArraySchema,
    icon: iconSchema,
    color: colorSchema
  }
});

export type CalloutBlock = typeof calloutBlockSchema.infer;

export const quoteBlockSchema = type({
  ...baseBlock,
  type: '"quote"',
  quote: {
    rich_text: richTextArraySchema,
    color: colorSchema
  }
});

export type QuoteBlock = typeof quoteBlockSchema.infer;

export const equationBlockSchema = type({
  ...baseBlock,
  type: '"equation"',
  equation: {
    expression: "string<=1000"
  }
});

export type EquationBlock = typeof equationBlockSchema.infer;

export const dividerBlockSchema = type({
  ...baseBlock,
  type: '"divider"',
  divider: type({})
});

export type DividerBlock = typeof dividerBlockSchema.infer;

export const tableOfContentsBlockSchema = type({
  ...baseBlock,
  type: '"table_of_contents"',
  table_of_contents: {
    "color?": colorSchema
  }
});

export type TableOfContentsBlock = typeof tableOfContentsBlockSchema.infer;

export const columnBlockSchema = type({
  ...baseBlock,
  type: '"column"',
  column: type({})
});

export type ColumnBlock = typeof columnBlockSchema.infer;

export const columnListBlockSchema = type({
  ...baseBlock,
  type: '"column_list"',
  column_list: type({})
});

export type ColumnListBlock = typeof columnListBlockSchema.infer;

export const linkPreviewBlockSchema = type({
  ...baseBlock,
  type: '"link_preview"',
  link_preview: {
    url: urlSchema
  }
});

export type LinkPreviewBlock = typeof linkPreviewBlockSchema.infer;

export const syncedBlockSchema = type({
  ...baseBlock,
  /**
   * Schema for a synced block in Notion.
   *
   * The `synced_block` property may optionally include a `synced_from` object,
   * which itself may optionally include a `type` (must be "block_id") and a `block_id` string.
   * If not present, `synced_from` is null.
   */
  type: '"synced_block"',
  synced_block: type({
    "synced_from?": type({
      "type?": '"block_id"',
      "block_id?": "string"
    })
  })
});

export type SyncedBlock = typeof syncedBlockSchema.infer;

export const templateBlockSchema = type({
  ...baseBlock,
  type: '"template"',
  template: {
    rich_text: richTextArraySchema
  }
});

export type TemplateBlock = typeof templateBlockSchema.infer;

export const linkToPageBlockSchema = type({
  ...baseBlock,
  type: '"link_to_page"',
  link_to_page: {
    type: '"page_id" | "database_id"',
    "page_id?": "string",
    "database_id?": "string"
  }
});

export type LinkToPageBlock = typeof linkToPageBlockSchema.infer;

export const tableBlockSchema = type({
  ...baseBlock,
  type: '"table"',
  table: {
    table_width: "number",
    has_column_header: "boolean",
    has_row_header: "boolean"
  }
});

export type TableBlock = typeof tableBlockSchema.infer;

export const tableRowBlockSchema = type({
  ...baseBlock,
  type: '"table_row"',
  table_row: {
    cells: [richTextArraySchema, "[]"]
  }
});

export type TableRowBlock = typeof tableRowBlockSchema.infer;

export const breadcrumbBlockSchema = type({
  ...baseBlock,
  type: '"breadcrumb"',
  breadcrumb: type({})
});

export type BreadcrumbBlock = typeof breadcrumbBlockSchema.infer;

export const unsupportedBlockSchema = type({
  ...baseBlock,
  type: '"unsupported"',
  unsupported: type({})
});

export type UnsupportedBlock = typeof unsupportedBlockSchema.infer;

export const blockSchema = type({
  id: "string",
  object: '"block"',
  type: "string",
  created_time: isoDateSchema,
  created_by: {
    object: '"user"',
    id: "string"
  },
  last_edited_time: isoDateSchema,
  last_edited_by: {
    object: '"user"',
    id: "string"
  },
  has_children: "boolean",
  archived: "boolean"
});

export type Block =
  | ParagraphBlock
  | Heading1Block
  | Heading2Block
  | Heading3Block
  | BulletedListItemBlock
  | NumberedListItemBlock
  | TodoBlock
  | ToggleBlock
  | CodeBlock
  | ChildPageBlock
  | ChildDatabaseBlock
  | EmbedBlock
  | ImageBlock
  | VideoBlock
  | FileBlock
  | PdfBlock
  | BookmarkBlock
  | CalloutBlock
  | QuoteBlock
  | EquationBlock
  | DividerBlock
  | TableOfContentsBlock
  | ColumnBlock
  | ColumnListBlock
  | LinkPreviewBlock
  | SyncedBlock
  | TemplateBlock
  | LinkToPageBlock
  | TableBlock
  | TableRowBlock
  | BreadcrumbBlock
  | AudioBlock
  | UnsupportedBlock;

/**
 * Type guard to check if a value is a valid Block.
 * Validates that the object has the required block structure with proper object type and ID.
 */
export function isBlock(value: unknown): value is Block {
  return (
    value !== null &&
    value !== undefined &&
    typeof value === "object" &&
    "object" in value &&
    value.object === "block" &&
    "id" in value &&
    typeof value.id === "string"
  );
}

/**
 * Extracts the block type from a block object.
 *
 * @param block - Block object with a type property
 * @returns The block type as a string
 */
export function getBlockType(block: { type: string }): string {
  return block.type;
}

/**
 * Checks if a block has children.
 *
 * @param block - Block object that may have children
 * @returns True if the block has children, false otherwise
 */
export function hasChildren(block: { has_children?: boolean }): boolean {
  return block.has_children === true;
}

/**
 * Validates that a rich text array does not exceed the 100 element limit.
 *
 * @param richTextArray - Array of rich text objects to validate
 * @returns True if the array is within limits, false otherwise
 */
export function validateRichTextArrayLength(richTextArray: unknown[]): boolean {
  return Array.isArray(richTextArray) && richTextArray.length <= 100;
}

/**
 * Validates that a URL string does not exceed the 2000 character limit.
 *
 * @param url - URL string to validate
 * @returns True if the URL is within limits, false otherwise
 */
export function validateUrlLength(url: string): boolean {
  return typeof url === "string" && url.length <= 2000;
}

/**
 * Validates that an email string does not exceed the 200 character limit.
 *
 * @param email - Email string to validate
 * @returns True if the email is within limits, false otherwise
 */
export function validateEmailLength(email: string): boolean {
  return typeof email === "string" && email.length <= 200;
}

/**
 * Validates that a phone number string does not exceed the 200 character limit.
 *
 * @param phone - Phone number string to validate
 * @returns True if the phone number is within limits, false otherwise
 */
export function validatePhoneLength(phone: string): boolean {
  return typeof phone === "string" && phone.length <= 200;
}

/**
 * Validates that an equation expression does not exceed the 1000 character limit.
 *
 * @param expression - Equation expression string to validate
 * @returns True if the expression is within limits, false otherwise
 */
export function validateEquationExpressionLength(expression: string): boolean {
  return typeof expression === "string" && expression.length <= 1000;
}

/**
 * Validates that rich text content does not exceed the 2000 character limit.
 *
 * @param content - Rich text content string to validate
 * @returns True if the content is within limits, false otherwise
 */
export function validateRichTextContentLength(content: string): boolean {
  return typeof content === "string" && content.length <= 2000;
}
