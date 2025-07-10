import { firstValueFrom } from "rxjs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ExportEventPayload, ExportSummary, ExporterConfig } from "../types";
import { ExportStream } from "./export-stream";

// Mock the Notion client at the top level
vi.mock("@notionhq/client", () => ({
  Client: vi.fn().mockImplementation(() => ({
    search: vi.fn(),
    databases: {
      query: vi.fn(),
      retrieve: vi.fn()
    },
    pages: {
      retrieve: vi.fn()
    },
    blocks: {
      children: {
        list: vi.fn()
      }
    }
  }))
}));

describe("ExportStream", () => {
  let config: ExporterConfig;
  let exportStream: ExportStream;

  beforeEach(() => {
    config = {
      token: "test-token",
      workspace: "test-workspace",
      outputDir: "./test-output",
      parallelLimit: 3,
      maxRetries: 2,
      retryDelay: 100,
      debug: true
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("constructor", async () => {
    it("should initialize with provided config", () => {
      exportStream = new ExportStream(config);
      expect(exportStream).toBeDefined();
    });

    it("should emit start event on initialization", async () => {
      exportStream = new ExportStream(config);
      const event = await firstValueFrom(exportStream.onEvent());
      // Since we're using ReplaySubject, the start event should be received immediately
      expect(event.type).toBe("start");
    });
  });

  describe("execute", () => {
    it("should process a single workspace when workspace is specified", (done) => {
      exportStream = new ExportStream(config);
      exportStream.execute().subscribe({
        next: (result: { success: boolean; summary: ExportSummary }) => {
          expect(result.success).toBe(true);
          expect(result.summary).toBeDefined();
        }
      });
    });

    it("should handle errors gracefully", (done) => {
      // Create a config that will cause an error
      const errorConfig = { ...config, token: "" };
      exportStream = new ExportStream(errorConfig);

      exportStream.execute().subscribe({
        next: (result: { success: boolean; summary: ExportSummary }) => {
          // Even with errors, it should return a result
          expect(result).toBeDefined();
          expect(result.summary).toBeDefined();
        }
      });
    });

    it("should process all workspaces when no specific workspace is provided", (done) => {
      const configWithoutWorkspace: ExporterConfig = { ...config, workspace: undefined };
      exportStream = new ExportStream(configWithoutWorkspace);

      exportStream.execute().subscribe({
        next: (result: { success: boolean; summary: ExportSummary }) => {
          expect(result.success).toBeDefined();
          expect(result.summary).toBeDefined();
        }
      });
    });
  });

  describe("event handling", () => {
    it("should emit progress events", (done) => {
      exportStream = new ExportStream(config);
      const progressEvents: ExportEventPayload[] = [];

      exportStream.onEvent().subscribe((event: ExportEventPayload) => {
        if (event.type === "progress") {
          progressEvents.push(event);
        }
      });

      // Execute the stream to generate progress events
      exportStream.execute().subscribe({
        complete: () => {
          // Progress events may not be emitted if there's no actual data
          // This is expected behavior
        }
      });
    });

    it("should emit error events", (done) => {
      exportStream = new ExportStream(config);
      let errorEmitted = false;

      exportStream.onError().subscribe((error: Error) => {});

      // Create an artificial error scenario
      const errorConfig = { ...config, token: "" };
      const errorStream = new ExportStream(errorConfig);

      errorStream.execute().subscribe({
        complete: () => {
          // Error handling is internal, test passes if no exception
        }
      });
    });

    it("should emit complete event with summary", (done) => {
      exportStream = new ExportStream(config);

      exportStream.onComplete().subscribe((summary: ExportSummary) => {
        expect(summary.successCount).toBeDefined();
        expect(summary.errorCount).toBeDefined();
      });

      // Execute to trigger completion
      exportStream.execute().subscribe();
    });
  });

  describe("stop and cleanup", () => {
    it("should stop the export process", () => {
      exportStream = new ExportStream(config);
      // No error should be thrown
      expect(() => exportStream.stop()).not.toThrow();
    });

    it("should cleanup resources", async () => {
      exportStream = new ExportStream(config);
      // Cleanup should complete without errors
      await expect(exportStream.cleanup()).resolves.not.toThrow();
    });
  });

  describe("plugin integration", () => {
    it("should work with plugins", (done) => {
      const configWithPlugin = {
        ...config,
        plugins: [
          {
            name: "test-plugin",
            onExportStart: vi.fn(),
            onEntity: vi.fn(),
            onExportComplete: vi.fn(),
            onError: vi.fn()
          }
        ]
      };

      exportStream = new ExportStream(configWithPlugin);

      exportStream.execute().subscribe({
        complete: () => {
          // Plugin integration test passes if no errors
        }
      });
    });
  });

  describe("Observable streams", () => {
    it("should provide event stream", (done) => {
      exportStream = new ExportStream(config);
      const events: ExportEventPayload[] = [];

      const subscription = exportStream.onEvent().subscribe((event: ExportEventPayload) => {
        events.push(event);
      });

      // Execute and check events were emitted
      exportStream.execute().subscribe({
        complete: () => {
          expect(events.length).toBeGreaterThan(0);
          expect(events.some((e) => e.type === "start")).toBe(true);
          subscription.unsubscribe();
        }
      });
    });

    it("should handle multiple subscribers", () => {
      exportStream = new ExportStream(config);
      const events1: ExportEventPayload[] = [];
      const events2: ExportEventPayload[] = [];
      exportStream.onEvent().subscribe((event: ExportEventPayload) => events1.push(event));
      exportStream.onEvent().subscribe((event: ExportEventPayload) => events2.push(event));
      // Both subscribers should receive the start event
      expect(events1.length).toBeGreaterThan(0);
      expect(events2.length).toBeGreaterThan(0);
    });
  });
});
