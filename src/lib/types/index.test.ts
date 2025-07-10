import { describe, expect, it } from "vitest";
import type {
  ExporterConfig,
  ExportEventPayload,
  ExportSummary,
  NotionBlock,
  NotionComment,
  NotionDatabase,
  NotionEntity,
  NotionEntityType,
  NotionPage,
  NotionUser
} from "./index";

describe("Notion Types", () => {
  describe("NotionEntityType", () => {
    it("should have all required entity types", () => {
      const validTypes: NotionEntityType[] = [
        "workspace",
        "page",
        "block",
        "database",
        "user",
        "comment",
        "relation",
        "composition"
      ];
      expect(validTypes).toHaveLength(8);
    });
  });

  describe("NotionEntity", () => {
    it("should have required base properties", () => {
      const entity: NotionEntity = {
        id: "test-id",
        type: "page"
      };
      expect(entity.id).toBe("test-id");
      expect(entity.type).toBe("page");
    });

    it("should support optional parent property", () => {
      const entity: NotionEntity = {
        id: "test-id",
        type: "block",
        parent: {
          type: "page",
          page_id: "parent-page-id"
        }
      };
      expect(entity.parent).toBeDefined();
      expect(entity.parent?.page_id).toBe("parent-page-id");
    });
  });

  describe("NotionPage", () => {
    it("should have all required page properties", () => {
      const page: NotionPage = {
        id: "page-id",
        type: "page",
        title: ["Test Page"],
        created_time: "2024-01-01T00:00:00Z",
        last_edited_time: "2024-01-01T00:00:00Z",
        archived: false
      };
      expect(page.type).toBe("page");
      expect(page.title).toEqual(["Test Page"]);
      expect(page.archived).toBe(false);
    });

    it("should support optional properties and children", () => {
      const page: NotionPage = {
        id: "page-id",
        type: "page",
        title: ["Test Page"],
        properties: { status: "published" },
        created_time: "2024-01-01T00:00:00Z",
        last_edited_time: "2024-01-01T00:00:00Z",
        archived: false,
        children: []
      };
      expect(page.properties).toBeDefined();
      expect(page.children).toBeDefined();
    });
  });

  describe("NotionBlock", () => {
    it("should have all required block properties", () => {
      const block: NotionBlock = {
        id: "block-id",
        type: "block",
        blockType: "paragraph",
        created_time: "2024-01-01T00:00:00Z",
        last_edited_time: "2024-01-01T00:00:00Z"
      };
      expect(block.type).toBe("block");
      expect(block.blockType).toBe("paragraph");
    });

    it("should support nested children blocks", () => {
      const childBlock: NotionBlock = {
        id: "child-block-id",
        type: "block",
        blockType: "text",
        created_time: "2024-01-01T00:00:00Z",
        last_edited_time: "2024-01-01T00:00:00Z"
      };

      const parentBlock: NotionBlock = {
        id: "parent-block-id",
        type: "block",
        blockType: "container",
        children: [childBlock],
        created_time: "2024-01-01T00:00:00Z",
        last_edited_time: "2024-01-01T00:00:00Z"
      };
      expect(parentBlock.children).toHaveLength(1);
      expect(parentBlock.children?.[0].id).toBe("child-block-id");
    });
  });

  describe("NotionDatabase", () => {
    it("should have all required database properties", () => {
      const database: NotionDatabase = {
        id: "db-id",
        type: "database",
        title: ["Test Database"],
        schema: [],
        properties: {},
        created_time: "2024-01-01T00:00:00Z",
        last_edited_time: "2024-01-01T00:00:00Z"
      };
      expect(database.type).toBe("database");
      expect(database.title).toEqual(["Test Database"]);
      expect(database.schema).toBeDefined();
    });
  });

  describe("NotionUser", () => {
    it("should have all required user properties", () => {
      const user: NotionUser = {
        id: "user-id",
        type: "user",
        name: "Test User"
      };
      expect(user.type).toBe("user");
      expect(user.name).toBe("Test User");
    });

    it("should support optional user properties", () => {
      const user: NotionUser = {
        id: "user-id",
        type: "user",
        name: "Test User",
        email: "test@example.com",
        avatarUrl: "https://example.com/avatar.jpg",
        status: "active"
      };
      expect(user.email).toBe("test@example.com");
      expect(user.avatarUrl).toBeDefined();
      expect(user.status).toBe("active");
    });
  });

  describe("NotionComment", () => {
    it("should have all required comment properties", () => {
      const comment: NotionComment = {
        id: "comment-id",
        type: "comment",
        content: ["This is a comment"],
        created_time: "2024-01-01T00:00:00Z",
        last_edited_time: "2024-01-01T00:00:00Z"
      };
      expect(comment.type).toBe("comment");
      expect(comment.content).toEqual(["This is a comment"]);
    });

    it("should support parent and user relationships", () => {
      const user: NotionUser = {
        id: "user-id",
        type: "user",
        name: "Commenter"
      };

      const comment: NotionComment = {
        id: "comment-id",
        type: "comment",
        content: ["This is a comment"],
        created_time: "2024-01-01T00:00:00Z",
        last_edited_time: "2024-01-01T00:00:00Z",
        parent: {
          type: "page",
          page_id: "page-id"
        },
        user
      };
      expect(comment.parent?.page_id).toBe("page-id");
      expect(comment.user?.name).toBe("Commenter");
    });
  });

  describe("ExporterConfig", () => {
    it("should have required token property", () => {
      const config: ExporterConfig = {
        token: "test-token"
      };
      expect(config.token).toBe("test-token");
    });

    it("should support all optional properties", () => {
      const config: ExporterConfig = {
        token: "test-token",
        workspace: "workspace-id",
        outputDir: "./output",
        parallelLimit: 5,
        maxRetries: 3,
        retryDelay: 1000,
        plugins: ["plugin1", "plugin2"],
        debug: true
      };
      expect(config.workspace).toBe("workspace-id");
      expect(config.parallelLimit).toBe(5);
      expect(config.plugins).toHaveLength(2);
    });
  });

  describe("ExportEventPayload", () => {
    it("should support start event", () => {
      const payload: ExportEventPayload = {
        type: "start",
        config: { token: "test-token" }
      };
      expect(payload.type).toBe("start");
      expect(payload.config.token).toBe("test-token");
    });

    it("should support entity event", () => {
      const entity: NotionEntity = {
        id: "entity-id",
        type: "page"
      };
      const payload: ExportEventPayload = {
        type: "entity",
        entity
      };
      expect(payload.type).toBe("entity");
      expect(payload.entity.id).toBe("entity-id");
    });

    it("should support error event", () => {
      const error = new Error("Test error");
      const entity: NotionEntity = {
        id: "entity-id",
        type: "page"
      };
      const payload: ExportEventPayload = {
        type: "error",
        error,
        entity
      };
      expect(payload.type).toBe("error");
      expect(payload.error.message).toBe("Test error");
      expect(payload.entity?.id).toBe("entity-id");
    });

    it("should support complete event", () => {
      const summary: ExportSummary = {
        successCount: 10,
        errorCount: 2,
        processedTypes: { page: 5, block: 5 },
        duration: 5000
      };
      const payload: ExportEventPayload = {
        type: "complete",
        summary
      };
      expect(payload.type).toBe("complete");
      expect(payload.summary.successCount).toBe(10);
    });

    it("should support progress event", () => {
      const payload: ExportEventPayload = {
        type: "progress",
        complete: 50,
        total: 100
      };
      expect(payload.type).toBe("progress");
      expect(payload.complete).toBe(50);
      expect(payload.total).toBe(100);
    });
  });

  describe("ExportSummary", () => {
    it("should have all required properties", () => {
      const summary: ExportSummary = {
        successCount: 100,
        errorCount: 5,
        processedTypes: {
          page: 50,
          block: 40,
          database: 10
        },
        duration: 10000
      };
      expect(summary.successCount).toBe(100);
      expect(summary.errorCount).toBe(5);
      expect(summary.processedTypes.page).toBe(50);
      expect(summary.duration).toBe(10000);
    });

    it("should support optional lastError", () => {
      const summary: ExportSummary = {
        successCount: 99,
        errorCount: 1,
        processedTypes: { page: 99 },
        duration: 5000,
        lastError: new Error("Last error")
      };
      expect(summary.lastError?.message).toBe("Last error");
    });
  });
});
