import { describe, expect, it } from "vitest";
import {
  blockSchema,
  calloutBlockSchema,
  codeBlockSchema,
  dividerBlockSchema,
  equationBlockSchema,
  fileBlockSchema,
  getBlockType,
  hasChildren,
  heading1BlockSchema,
  heading2BlockSchema,
  imageBlockSchema,
  isBlock,
  paragraphBlockSchema,
  tableOfContentsBlockSchema,
  toDoBlockSchema
} from "./blocks";
import type { BlockId } from "./brands";

describe("Block Schemas", () => {
  const baseBlockProperties = {
    id: "16ad7342e57180c4a065c7a1015871d3" as BlockId,
    object: "block" as const,
    created_time: "2023-01-01T00:00:00.000Z",
    created_by: { object: "user" as const, id: "16ad7342e57180c4a065c7a1015871d3" },
    last_edited_time: "2023-01-01T00:00:00.000Z",
    last_edited_by: { object: "user" as const, id: "16ad7342e57180c4a065c7a1015871d3" },
    has_children: false,
    archived: false
  };

  describe("Paragraph Block", () => {
    it("should validate a simple paragraph block", () => {
      const block = {
        ...baseBlockProperties,
        type: "paragraph",
        paragraph: {
          rich_text: [
            {
              type: "text",
              text: { content: "Hello world", link: null },
              annotations: {
                bold: false,
                italic: false,
                strikethrough: false,
                underline: false,
                code: false,
                color: "default"
              },
              plain_text: "Hello world",
              href: null
            }
          ],
          color: "default"
        }
      };

      const result = paragraphBlockSchema(block);
      expect(result).toEqual(block);
    });

    it("should validate paragraph with children", () => {
      const block = {
        ...baseBlockProperties,
        type: "paragraph",
        has_children: true,
        paragraph: {
          rich_text: [],
          color: "blue"
        }
      };

      const result = paragraphBlockSchema(block);
      expect(result).toEqual(block);
    });

    it("should reject invalid paragraph color", () => {
      const block = {
        ...baseBlockProperties,
        type: "paragraph",
        paragraph: {
          rich_text: [],
          color: "invalid_color"
        }
      };

      const result = paragraphBlockSchema(block);
      expect(result).toHaveProperty(" arkKind", "errors");
    });
  });

  describe("Heading Blocks", () => {
    it("should validate heading_1 block", () => {
      const block = {
        ...baseBlockProperties,
        type: "heading_1",
        heading_1: {
          rich_text: [
            {
              type: "text",
              text: { content: "Main Title", link: null },
              annotations: {
                bold: true,
                italic: false,
                strikethrough: false,
                underline: false,
                code: false,
                color: "default"
              },
              plain_text: "Main Title",
              href: null
            }
          ],
          color: "default",
          is_toggleable: false
        }
      };

      const result = heading1BlockSchema(block);
      expect(result).toEqual(block);
    });

    it("should validate toggleable heading", () => {
      const block = {
        ...baseBlockProperties,
        type: "heading_2",
        has_children: true,
        heading_2: {
          rich_text: [
            {
              type: "text",
              text: { content: "Toggleable Section", link: null },
              annotations: {
                bold: false,
                italic: false,
                strikethrough: false,
                underline: false,
                code: false,
                color: "default"
              },
              plain_text: "Toggleable Section",
              href: null
            }
          ],
          color: "default",
          is_toggleable: true
        }
      };

      const result = heading2BlockSchema(block);
      expect(result).toEqual(block);
    });
  });

  describe("To-do Block", () => {
    it("should validate checked todo", () => {
      const block = {
        ...baseBlockProperties,
        type: "to_do",
        to_do: {
          rich_text: [
            {
              type: "text",
              text: { content: "Complete SDK implementation", link: null },
              annotations: {
                bold: false,
                italic: false,
                strikethrough: false,
                underline: false,
                code: false,
                color: "default"
              },
              plain_text: "Complete SDK implementation",
              href: null
            }
          ],
          checked: true,
          color: "green"
        }
      };

      const result = toDoBlockSchema(block);
      expect(result).toEqual(block);
    });

    it("should validate unchecked todo with children", () => {
      const block = {
        ...baseBlockProperties,
        type: "to_do",
        has_children: true,
        to_do: {
          rich_text: [
            {
              type: "text",
              text: { content: "Parent task", link: null },
              annotations: {
                bold: false,
                italic: false,
                strikethrough: false,
                underline: false,
                code: false,
                color: "default"
              },
              plain_text: "Parent task",
              href: null
            }
          ],
          checked: false,
          color: "default"
        }
      };

      const result = toDoBlockSchema(block);
      expect(result).toEqual(block);
    });
  });

  describe("Code Block", () => {
    it("should validate code block with language", () => {
      const block = {
        ...baseBlockProperties,
        type: "code",
        code: {
          rich_text: [
            {
              type: "text",
              text: { content: "const hello = 'world';", link: null },
              annotations: {
                bold: false,
                italic: false,
                strikethrough: false,
                underline: false,
                code: false,
                color: "default"
              },
              plain_text: "const hello = 'world';",
              href: null
            }
          ],
          caption: [],
          language: "typescript"
        }
      };

      const result = codeBlockSchema(block);
      expect(result).toEqual(block);
    });

    it("should validate code block with caption", () => {
      const block = {
        ...baseBlockProperties,
        type: "code",
        code: {
          rich_text: [
            {
              type: "text",
              text: { content: "print('Hello')", link: null },
              annotations: {
                bold: false,
                italic: false,
                strikethrough: false,
                underline: false,
                code: false,
                color: "default"
              },
              plain_text: "print('Hello')",
              href: null
            }
          ],
          caption: [
            {
              type: "text",
              text: { content: "Python example", link: null },
              annotations: {
                bold: false,
                italic: true,
                strikethrough: false,
                underline: false,
                code: false,
                color: "default"
              },
              plain_text: "Python example",
              href: null
            }
          ],
          language: "python"
        }
      };

      const result = codeBlockSchema(block);
      expect(result).toEqual(block);
    });
  });

  describe("Media Blocks", () => {
    it("should validate external image block", () => {
      const block = {
        ...baseBlockProperties,
        type: "image",
        image: {
          type: "external",
          external: { url: "https://example.com/image.png" }
        }
      };

      const result = imageBlockSchema(block);
      expect(result).toEqual(block);
    });

    it("should validate internal file block", () => {
      const block = {
        ...baseBlockProperties,
        type: "file",
        file: {
          type: "file",
          file: {
            url: "https://s3.amazonaws.com/file.pdf",
            expiry_time: "2023-12-31T23:59:59.000Z"
          }
        }
      };

      const result = fileBlockSchema(block);
      expect(result).toEqual(block);
    });
  });

  describe("Callout Block", () => {
    it("should validate callout with emoji icon", () => {
      const block = {
        ...baseBlockProperties,
        type: "callout",
        callout: {
          rich_text: [
            {
              type: "text",
              text: { content: "Important note", link: null },
              annotations: {
                bold: false,
                italic: false,
                strikethrough: false,
                underline: false,
                code: false,
                color: "default"
              },
              plain_text: "Important note",
              href: null
            }
          ],
          icon: {
            type: "emoji",
            emoji: "💡"
          },
          color: "yellow_background"
        }
      };

      const result = calloutBlockSchema(block);
      expect(result).toEqual(block);
    });

    it("should validate callout with external icon", () => {
      const block = {
        ...baseBlockProperties,
        type: "callout",
        has_children: true,
        callout: {
          rich_text: [
            {
              type: "text",
              text: { content: "Warning", link: null },
              annotations: {
                bold: true,
                italic: false,
                strikethrough: false,
                underline: false,
                code: false,
                color: "red"
              },
              plain_text: "Warning",
              href: null
            }
          ],
          icon: {
            type: "external",
            external: { url: "https://example.com/warning.png" }
          },
          color: "red_background"
        }
      };

      const result = calloutBlockSchema(block);
      expect(result).toEqual(block);
    });
  });

  describe("Special Blocks", () => {
    it("should validate equation block", () => {
      const block = {
        ...baseBlockProperties,
        type: "equation",
        equation: {
          expression: "E = mc^2"
        }
      };

      const result = equationBlockSchema(block);
      expect(result).toEqual(block);
    });

    it("should validate divider block", () => {
      const block = {
        ...baseBlockProperties,
        type: "divider",
        divider: {}
      };

      const result = dividerBlockSchema(block);
      expect(result).toEqual(block);
    });

    it("should validate table of contents block", () => {
      const block = {
        ...baseBlockProperties,
        type: "table_of_contents",
        table_of_contents: {
          color: "gray"
        }
      };

      const result = tableOfContentsBlockSchema(block);
      expect(result).toEqual(block);
    });
  });

  describe("Block Union Schema", () => {
    it("should validate any valid block type", () => {
      const paragraphBlock = {
        ...baseBlockProperties,
        type: "paragraph",
        paragraph: { rich_text: [], color: "default" }
      };

      const result = blockSchema(paragraphBlock);
      expect(result).toEqual(paragraphBlock);
    });

    it("should validate block with additional properties", () => {
      const customBlock = {
        ...baseBlockProperties,
        type: "custom_type",
        custom_type: { some_property: "value" }
      };

      const result = blockSchema(customBlock);
      expect(result).toEqual(customBlock);
    });
  });

  describe("Type Utilities", () => {
    it("should correctly identify blocks", () => {
      expect(isBlock({ object: "block", id: "16ad7342e57180c4a065c7a1015871d3" as BlockId })).toBe(true);
      expect(isBlock({ object: "page", id: "16ad7342e57180c4a065c7a1015871d3" })).toBe(false);
      expect(isBlock(null)).toBe(false);
      expect(isBlock(undefined)).toBe(false);
    });

    it("should extract block type", () => {
      const paragraphBlock = {
        ...baseBlockProperties,
        type: "paragraph",
        paragraph: { rich_text: [], color: "default" }
      };

      expect(getBlockType(paragraphBlock)).toBe("paragraph");
      expect(getBlockType({ type: "heading_1" } as any)).toBe("heading_1");
    });

    it("should check if block has children", () => {
      expect(hasChildren({ has_children: true } as any)).toBe(true);
      expect(hasChildren({ has_children: false } as any)).toBe(false);
      expect(hasChildren({} as any)).toBe(false);
    });
  });

  describe("Rich Text Array Validation", () => {
    it("should validate rich text array with correct length", () => {
      const validArray = Array(50).fill({
        type: "text",
        text: { content: "test", link: null },
        annotations: {
          bold: false,
          italic: false,
          strikethrough: false,
          underline: false,
          code: false,
          color: "default"
        },
        plain_text: "test",
        href: null
      });

      const block = {
        ...baseBlockProperties,
        type: "paragraph",
        paragraph: {
          rich_text: validArray,
          color: "default"
        }
      };

      const result = paragraphBlockSchema(block);
      expect(result).toEqual(block);
    });

    it("should reject rich text array with too many elements", () => {
      const invalidArray = Array(101).fill({
        type: "text",
        text: { content: "test", link: null },
        annotations: {
          bold: false,
          italic: false,
          strikethrough: false,
          underline: false,
          code: false,
          color: "default"
        },
        plain_text: "test",
        href: null
      });

      const block = {
        ...baseBlockProperties,
        type: "paragraph",
        paragraph: {
          rich_text: invalidArray,
          color: "default"
        }
      };

      const result = paragraphBlockSchema(block);
      expect(result).toHaveProperty(" arkKind", "errors");
    });
  });
});
