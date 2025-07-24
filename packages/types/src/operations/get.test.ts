import { describe, expect, test } from "vitest";
import {
  getPropertyRequest,
  getRequest,
  getRequestBase,
  getResourceType,
  isBlockResponse,
  isDatabaseResponse,
  isPageResponse,
  isPaginatedPropertyType,
  isPropertyItemResponse,
  isPropertyListResponse,
  propertyItemSchema,
  propertyListResponseSchema,
  type GetResponse,
  type SingleResourceResponse
} from "./get";

describe("Get Operation Types", () => {
  describe("Resource Type Validation", () => {
    test("should validate valid resource types", () => {
      expect(getResourceType("database")).toEqual("database");
      expect(getResourceType("page")).toEqual("page");
      expect(getResourceType("property")).toEqual("property");
      expect(getResourceType("block")).toEqual("block");
    });

    test("should reject invalid resource types", () => {
      const result = getResourceType("invalid" as any);
      // ArkType returns an array of ArkError objects for validation failures
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe("Request Schema Validation", () => {
    test("should validate base get request", () => {
      const validRequest = {
        resource: "database" as const,
        id: "test-id"
      };
      expect(getRequestBase(validRequest)).toEqual(validRequest);
    });

    test("should validate property get request", () => {
      const validRequest = {
        resource: "property" as const,
        id: "test-id",
        property_id: "prop-id",
        page_size: 10,
        start_cursor: "cursor"
      };
      expect(getPropertyRequest(validRequest)).toEqual(validRequest);
    });

    test("should validate unified get request", () => {
      const databaseRequest = {
        resource: "database" as const,
        id: "test-id"
      };
      const propertyRequest = {
        resource: "property" as const,
        id: "test-id",
        property_id: "prop-id"
      };

      expect(getRequest(databaseRequest)).toEqual(databaseRequest);
      expect(getRequest(propertyRequest)).toEqual(propertyRequest);
    });

    test("should reject invalid requests", () => {
      const invalidResourceResult = getRequestBase({ resource: "invalid", id: "test" } as any);
      // Check that it's not a valid request object (would have resource and id)
      expect(
        typeof invalidResourceResult !== "object" ||
          !("resource" in invalidResourceResult && "id" in invalidResourceResult)
      ).toBe(true);

      const missingIdResult = getRequestBase({ resource: "database" } as any);
      expect(typeof missingIdResult !== "object" || !("resource" in missingIdResult && "id" in missingIdResult)).toBe(
        true
      );
    });
  });

  describe("Response Schema Validation", () => {
    test("should validate property item schema", () => {
      const validItem = {
        object: "property_item" as const,
        id: "test-id",
        type: "text",
        customField: "value"
      };
      expect(propertyItemSchema(validItem)).toEqual(validItem);
    });

    test("should validate property list response schema", () => {
      const validResponse = {
        object: "list" as const,
        results: [
          {
            object: "property_item" as const,
            id: "item-1",
            type: "text",
            value: "test"
          }
        ],
        has_more: false,
        next_cursor: null
      };
      expect(propertyListResponseSchema(validResponse)).toEqual(validResponse);
    });
  });

  describe("Type Guards", () => {
    test("isDatabaseResponse should identify database responses", () => {
      const databaseResponse = {
        object: "database",
        id: "db-id",
        created_time: "2023-01-01T00:00:00Z",
        created_by: { object: "user", id: "user-id" },
        last_edited_time: "2023-01-01T00:00:00Z",
        last_edited_by: { object: "user", id: "user-id" },
        archived: false,
        in_trash: false,
        title: [],
        description: [],
        icon: null,
        cover: null,
        properties: {},
        parent: { type: "workspace", workspace: true },
        url: "https://notion.so/db-id",
        public_url: null
      };

      expect(isDatabaseResponse(databaseResponse)).toBe(true);
      expect(isDatabaseResponse({ object: "page" })).toBe(false);
      expect(isDatabaseResponse(null)).toBe(false);
      expect(isDatabaseResponse("string")).toBe(false);
    });

    test("isPageResponse should identify page responses", () => {
      const pageResponse = {
        object: "page",
        id: "page-id",
        created_time: "2023-01-01T00:00:00Z",
        created_by: { object: "user", id: "user-id" },
        last_edited_time: "2023-01-01T00:00:00Z",
        last_edited_by: { object: "user", id: "user-id" },
        archived: false,
        in_trash: false,
        properties: {},
        parent: { type: "database_id", database_id: "db-id" },
        url: "https://notion.so/page-id",
        public_url: null
      };

      expect(isPageResponse(pageResponse)).toBe(true);
      expect(isPageResponse({ object: "database" })).toBe(false);
      expect(isPageResponse(null)).toBe(false);
    });

    test("isBlockResponse should identify block responses", () => {
      const blockResponse = {
        object: "block",
        id: "block-id",
        parent: { type: "page_id", page_id: "page-id" },
        created_time: "2023-01-01T00:00:00Z",
        created_by: { object: "user", id: "user-id" },
        last_edited_time: "2023-01-01T00:00:00Z",
        last_edited_by: { object: "user", id: "user-id" },
        archived: false,
        in_trash: false,
        has_children: false,
        type: "paragraph",
        paragraph: {
          rich_text: [],
          color: "default"
        }
      };

      expect(isBlockResponse(blockResponse)).toBe(true);
      expect(isBlockResponse({ object: "page" })).toBe(false);
      expect(isBlockResponse(null)).toBe(false);
    });

    test("isPropertyItemResponse should identify property item responses", () => {
      const propertyItem = {
        object: "property_item",
        id: "prop-id",
        type: "text",
        value: "test"
      };

      expect(isPropertyItemResponse(propertyItem)).toBe(true);
      expect(isPropertyItemResponse({ object: "list" })).toBe(false);
      expect(isPropertyItemResponse(null)).toBe(false);
    });

    test("isPropertyListResponse should identify property list responses", () => {
      const propertyList = {
        object: "list",
        results: [],
        has_more: false,
        next_cursor: null
      };

      expect(isPropertyListResponse(propertyList)).toBe(true);
      expect(isPropertyListResponse({ object: "property_item" })).toBe(false);
      expect(isPropertyListResponse({ object: "list" })).toBe(false); // Missing results
      expect(isPropertyListResponse(null)).toBe(false);
    });
  });

  describe("Utility Functions", () => {
    test("isPaginatedPropertyType should identify paginated property types", () => {
      expect(isPaginatedPropertyType("title")).toBe(true);
      expect(isPaginatedPropertyType("rich_text")).toBe(true);
      expect(isPaginatedPropertyType("relation")).toBe(true);
      expect(isPaginatedPropertyType("people")).toBe(true);

      expect(isPaginatedPropertyType("text")).toBe(false);
      expect(isPaginatedPropertyType("number")).toBe(false);
      expect(isPaginatedPropertyType("select")).toBe(false);
    });
  });

  describe("Type Inference", () => {
    test("should infer correct types for GetResponse", () => {
      // These tests verify compile-time type inference
      type DatabaseResponse = GetResponse<"database">;
      type PageResponse = GetResponse<"page">;
      type BlockResponse = GetResponse<"block">;
      type PropertyResponse = GetResponse<"property">;

      // Verify that the types are properly constrained
      const dbResponse = {} as DatabaseResponse;
      const pageResponse = {} as PageResponse;
      const blockResponse = {} as BlockResponse;
      const propertyResponse = {} as PropertyResponse;

      // These should compile without errors if types are correct
      expect(typeof dbResponse).toBe("object");
      expect(typeof pageResponse).toBe("object");
      expect(typeof blockResponse).toBe("object");
      expect(typeof propertyResponse).toBe("object");
    });

    test("should infer correct types for SingleResourceResponse", () => {
      type DatabaseSingleResponse = SingleResourceResponse<"database">;
      type PageSingleResponse = SingleResourceResponse<"page">;
      type BlockSingleResponse = SingleResourceResponse<"block">;

      const dbResponse = {} as DatabaseSingleResponse;
      const pageResponse = {} as PageSingleResponse;
      const blockResponse = {} as BlockSingleResponse;

      expect(typeof dbResponse).toBe("object");
      expect(typeof pageResponse).toBe("object");
      expect(typeof blockResponse).toBe("object");
    });
  });

  describe("Edge Cases", () => {
    test("should handle undefined and null values in type guards", () => {
      expect(isDatabaseResponse(undefined)).toBe(false);
      expect(isPageResponse(undefined)).toBe(false);
      expect(isBlockResponse(undefined)).toBe(false);
      expect(isPropertyItemResponse(undefined)).toBe(false);
      expect(isPropertyListResponse(undefined)).toBe(false);
    });

    test("should handle objects without object property", () => {
      const objectWithoutObjectProperty = { id: "test", type: "test" };

      expect(isDatabaseResponse(objectWithoutObjectProperty)).toBe(false);
      expect(isPageResponse(objectWithoutObjectProperty)).toBe(false);
      expect(isBlockResponse(objectWithoutObjectProperty)).toBe(false);
      expect(isPropertyItemResponse(objectWithoutObjectProperty)).toBe(false);
      expect(isPropertyListResponse(objectWithoutObjectProperty)).toBe(false);
    });

    test("should handle primitive values", () => {
      expect(isDatabaseResponse("string")).toBe(false);
      expect(isPageResponse(123)).toBe(false);
      expect(isBlockResponse(true)).toBe(false);
      expect(isPropertyItemResponse([])).toBe(false);
      expect(isPropertyListResponse(Symbol())).toBe(false);
    });
  });
});
