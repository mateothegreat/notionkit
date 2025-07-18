import { type } from "arktype";
import { colorSchema } from "./schemas";

/**
 * Enforce value to be an empty object.
 */
export const emptyObject = type({}).narrow((data, ctx) => {
  if (Object.keys(data).length === 0) {
    return true;
  }
  ctx.error('must be an empty object "{}"');
  return false;
});

/**
 * Rich text schema with validation for content and link URL limits.
 * Ensures text content does not exceed 2000 characters and link URLs do not exceed 2000 characters.
 */
export const richTextSchema = type({
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
 * Base property schema containing common fields for all property types.
 */
export const titleBasePropertySchema = {
  id: "string",
  type: "string"
} as const;
