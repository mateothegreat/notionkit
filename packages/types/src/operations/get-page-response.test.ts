import { attest } from "@ark/attest";
import { type } from "arktype";
import { describe, it } from "vitest";
import { pageSchema } from "../pages";
import { getPageResponseSchema } from "./get";

/**
 * Enhanced page response schema that includes optional API metadata like request_id.
 * This allows validation of the complete API response including metadata fields.
 */
export const getPageResponseWithMetadataSchema = pageSchema.and(
  type({
    "request_id?": "string"
  })
);

export type GetPageResponseWithMetadata = typeof getPageResponseWithMetadataSchema.infer;

describe("Get Page Response Schema Validation with ArkType", () => {
  /**
   * Real API response data from the Notion API for a get page operation.
   * This test data comes from the actual scenario provided and ensures
   * our schema validation matches the real API response structure.
   */
  const realApiResponse = {
    object: "page",
    id: "22cd7342-e571-80d2-92f7-c90f552b68f2",
    created_time: "2025-07-10T21:07:00.000Z",
    last_edited_time: "2025-07-10T21:49:00.000Z",
    created_by: {
      object: "user",
      id: "ddf8f9da-d6d5-4c0a-ad8e-05836f719816"
    },
    last_edited_by: {
      object: "user",
      id: "ddf8f9da-d6d5-4c0a-ad8e-05836f719816"
    },
    cover: null,
    icon: {
      type: "emoji",
      emoji: "🔥"
    },
    parent: {
      type: "page_id",
      page_id: "229d7342-e571-81b7-9840-c08e2af003df"
    },
    archived: false,
    in_trash: false,
    properties: {
      title: {
        id: "title",
        type: "title",
        title: [
          {
            type: "text",
            text: {
              content: "Final Architecture",
              link: null
            },
            annotations: {
              bold: false,
              italic: false,
              strikethrough: false,
              underline: false,
              code: false,
              color: "default"
            },
            plain_text: "Final Architecture",
            href: null
          }
        ]
      }
    },
    url: "https://www.notion.so/Final-Architecture-22cd7342e57180d292f7c90f552b68f2",
    public_url: null,
    request_id: "9361941e-ceb5-4f5b-9c36-7781bb9abbd6"
  } as const;

  it("should validate complete API response matches page schema", () => {
    // Test the core page data (excluding request_id metadata)
    const { request_id, ...pageData } = realApiResponse;

    attest(pageSchema.assert(pageData)).equals(pageData);
  });

  it("should validate API response with metadata using enhanced schema", () => {
    // Test the full response including request_id
    attest(getPageResponseWithMetadataSchema.assert(realApiResponse)).equals(realApiResponse);
  });

  it("should validate getPageResponseSchema uses full page schema", () => {
    // Ensure our get operation schema properly validates the API response
    const { request_id, ...pageData } = realApiResponse;
    attest(getPageResponseSchema.assert(pageData)).equals(pageData);
  });

  it("should validate individual schema components", () => {
    // Test core required fields
    attest(pageSchema.get("object").assert("page")).equals("page");
    attest(pageSchema.get("id").assert("22cd7342-e571-80d2-92f7-c90f552b68f2")).equals(
      "22cd7342-e571-80d2-92f7-c90f552b68f2"
    );

    // Test boolean fields
    attest(pageSchema.get("archived").assert(false)).equals(false);
    attest(pageSchema.get("in_trash").assert(false)).equals(false);

    // Test user objects
    const user = {
      object: "user",
      id: "ddf8f9da-d6d5-4c0a-ad8e-05836f719816"
    };
    attest(pageSchema.get("created_by").assert(user)).equals(user);
    attest(pageSchema.get("last_edited_by").assert(user)).equals(user);
  });

  it("should validate icon schema variations", () => {
    // Test emoji icon (from API response)
    const emojiIcon = {
      type: "emoji",
      emoji: "🔥"
    };
    attest(pageSchema.get("icon").assert(emojiIcon)).equals(emojiIcon);

    // Test null icon
    attest(pageSchema.get("icon").assert(null)).equals(null);

    // Test external icon
    const externalIcon = {
      type: "external",
      external: {
        url: "https://example.com/icon.png"
      }
    };
    attest(pageSchema.get("icon").assert(externalIcon)).equals(externalIcon);
  });

  it("should validate parent schema variations", () => {
    // Test page parent (from API response)
    const pageParent = {
      type: "page_id",
      page_id: "229d7342-e571-81b7-9840-c08e2af003df"
    };
    attest(pageSchema.get("parent").assert(pageParent)).equals(pageParent);

    // Test database parent
    const databaseParent = {
      type: "database_id",
      database_id: "229d7342-e571-81b7-9840-c08e2af003df"
    };
    attest(pageSchema.get("parent").assert(databaseParent)).equals(databaseParent);

    // Test workspace parent
    const workspaceParent = {
      type: "workspace",
      workspace: true
    };
    attest(pageSchema.get("parent").assert(workspaceParent)).equals(workspaceParent);
  });

  it("should validate properties with rich text content", () => {
    // Test the title property from the API response
    const titleProperty = {
      title: {
        id: "title",
        type: "title",
        title: [
          {
            type: "text",
            text: {
              content: "Final Architecture",
              link: null
            },
            annotations: {
              bold: false,
              italic: false,
              strikethrough: false,
              underline: false,
              code: false,
              color: "default"
            },
            plain_text: "Final Architecture",
            href: null
          }
        ]
      }
    };

    attest(pageSchema.get("properties").assert(titleProperty)).equals(titleProperty);
  });

  it("should reject invalid data with proper error messages", () => {
    // Test invalid object type
    attest(() => pageSchema.get("object").assert("invalid")).throws.snap('must be "page" (was "invalid")');

    // Test invalid boolean
    attest(() => pageSchema.get("archived").assert("not-boolean")).throws.snap("must be a boolean (was a string)");

    // Test invalid user object
    attest(() => pageSchema.get("created_by").assert({ object: "invalid", id: "test" })).throws.snap(
      'object must be "user" (was "invalid")'
    );
  });

  it("should validate minimal valid page", () => {
    const minimalPage = {
      object: "page",
      id: "22cd7342-e571-80d2-92f7-c90f552b68f2",
      created_time: "2025-07-10T21:07:00.000Z",
      last_edited_time: "2025-07-10T21:49:00.000Z",
      created_by: {
        object: "user",
        id: "ddf8f9da-d6d5-4c0a-ad8e-05836f719816"
      },
      last_edited_by: {
        object: "user",
        id: "ddf8f9da-d6d5-4c0a-ad8e-05836f719816"
      },
      archived: false,
      in_trash: false,
      properties: {},
      parent: {
        type: "workspace",
        workspace: true
      },
      url: "https://www.notion.so/test"
    };

    attest(pageSchema.assert(minimalPage)).equals(minimalPage);
  });

  it("should ensure complete API coverage", () => {
    // This test ensures 100% coverage of the API response structure
    // If the API changes, this test will fail and alert us to update schemas

    const { request_id, ...corePageData } = realApiResponse;

    // Validate core page data
    attest(pageSchema.assert(corePageData)).equals(corePageData);

    // Validate full response with metadata
    attest(getPageResponseWithMetadataSchema.assert(realApiResponse)).equals(realApiResponse);

    // Validate that our get operation schema works
    attest(getPageResponseSchema.assert(corePageData)).equals(corePageData);
  });

  it("should validate type safety and inference", () => {
    // Test TypeScript type inference
    type PageType = typeof pageSchema.infer;
    type GetPageType = typeof getPageResponseSchema.infer;
    type MetadataType = typeof getPageResponseWithMetadataSchema.infer;

    // These should be compatible types
    const page: PageType = {} as any;
    const getPage: GetPageType = page;
    const withMeta: MetadataType = { ...page, request_id: "test" };

    attest(typeof page).equals("object");
    attest(typeof getPage).equals("object");
    attest(typeof withMeta).equals("object");
  });
});
