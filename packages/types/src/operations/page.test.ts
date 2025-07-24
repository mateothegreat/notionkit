import { attest } from "@arktype/attest";
import { pageSchema } from "src";
import { expect, test } from "vitest";

test("page schema", () => {
  const sampleResponse = {
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
  };

  // Use contextualize to provide rich diagnostics if needed
  expect(attest(sampleResponse).typedAs(pageSchema)).toBe(true);
});
