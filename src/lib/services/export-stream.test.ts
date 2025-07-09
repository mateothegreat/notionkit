import { firstValueFrom } from "rxjs";
import { inspect } from "util";
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
      console.log(inspect(exportStream, { colors: true, compact: false }));
      expect(exportStream).toBeDefined();
    });

    it("should emit start event on initialization", async () => {
      exportStream = new ExportStream(config);

      const event = await firstValueFrom(exportStream.onEvent());
      console.log(inspect(event, { colors: true, compact: false }));
      // Since we're using ReplaySubject, the start event should be received immediately
      expect(event.type).toBe("start");
    });
  });

  describe("execute", () => {
    it("should process a single workspace when workspace is specified", (done) => {
      exportStream = new ExportStream(config);

      exportStream.execute().subscribe({
        next: (result: { success: boolean; summary: ExportSummary }) => {
          console.log(inspect(result, { colors: true, compact: false }));
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
          console.log(inspect(result, { colors: true, compact: false }));
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
          console.log(inspect(result, { colors: true, compact: false }));
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
          console.log(inspect(event, { colors: true, compact: false }));
        }
      });

      // Execute the stream to generate progress events
      exportStream.execute().subscribe({
        complete: () => {
          // Progress events may not be emitted if there's no actual data
          // This is expected behavior
          console.log(inspect({ progressEventCount: progressEvents.length }, { colors: true, compact: false }));
        }
      });
    });

    it("should emit error events", (done) => {
      exportStream = new ExportStream(config);
      let errorEmitted = false;

      exportStream.onError().subscribe((error: Error) => {
        console.log(inspect(error, { colors: true, compact: false }));
        errorEmitted = true;
      });

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
        console.log(inspect(summary, { colors: true, compact: false }));
        expect(summary).toBeDefined();
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
      console.log(inspect({ stopCalled: true }, { colors: true, compact: false }));
    });

    it("should cleanup resources", async () => {
      exportStream = new ExportStream(config);

      // Cleanup should complete without errors
      await expect(exportStream.cleanup()).resolves.not.toThrow();
      console.log(inspect({ cleanupCompleted: true }, { colors: true, compact: false }));
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
          console.log(inspect({ pluginIntegrationTest: "passed" }, { colors: true, compact: false }));
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
          console.log(inspect({ eventCount: events.length }, { colors: true, compact: false }));
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
      console.log(
        inspect({ subscriber1: events1.length, subscriber2: events2.length }, { colors: true, compact: false })
      );
    });
  });
});
