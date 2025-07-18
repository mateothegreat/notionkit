import { attest } from "@ark/attest";
import { describe, it } from "vitest";
import { query } from "./query";

describe("Query Schema Type Tests", () => {
  it("should validate a simple property filter", () => {
    const filter: typeof query.propertyFilter.infer = {
      property: "name",
      title: {
        equals: "Test"
      }
    };
    attest(query.propertyFilter.assert(filter)).equals(filter);
  });

  it("should invalidate a bad property filter", () => {
    const filter = {
      property: "name",
      title: {
        equals: 123
      }
    };
    attest(() => query.propertyFilter.assert(filter)).throws.snap(
      "TraversalError: title.equals must be a string (was a number)"
    );
  });

  it("should validate a recursive database filter", () => {
    const filter: typeof query.databaseFilter.infer = {
      property: "dummy", // This property is required by the intersection
      and: [
        {
          property: "name",
          title: {
            contains: "Test"
          }
        },
        {
          property: "dummy 2", // This property is also required
          or: [
            {
              property: "value",
              number: {
                greater_than: 10
              }
            },
            {
              property: "completed",
              checkbox: {
                equals: true
              }
            }
          ]
        }
      ]
    };
    attest(query.databaseFilter.assert(filter)).equals(filter);
  });

  it("should validate a complex page object", () => {
    const page: typeof query.pageObject.infer = {
      object: "page",
      id: "11111111111111111111111111111111",
      created_time: "2022-01-01T00:00:00.000Z",
      last_edited_time: "2022-01-01T00:00:00.000Z",
      created_by: { object: "user", id: "22222222222222222222222222222222" },
      last_edited_by: { object: "user", id: "33333333333333333333333333333333" },
      parent: { type: "workspace", workspace: true },
      archived: false,
      properties: {
        title: {
          id: "title",
          type: "title",
          title: [
            {
              type: "text",
              text: { content: "Page Title", link: null },
              annotations: {
                bold: false,
                italic: false,
                strikethrough: false,
                underline: false,
                code: false,
                color: "default"
              },
              plain_text: "Page Title",
              href: null
            }
          ]
        },
        number: {
          id: "number",
          type: "number",
          number: 123
        }
      },
      url: "http://example.com"
    };
    attest(query.pageObject.assert(page)).equals(page);
  });

  it("should validate a database query response", () => {
    const response: typeof query.databaseQueryResponse.infer = {
      object: "list",
      results: [],
      next_cursor: null,
      has_more: false,
      type: "page_or_database",
      page_or_database: {}
    };
    attest(query.databaseQueryResponse.assert(response)).equals(response);
  });
});
