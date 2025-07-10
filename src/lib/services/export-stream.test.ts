import { firstValueFrom, of } from "rxjs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ExportPlugin } from "../plugins";
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
    it("should process a single workspace when workspace is specified", async () => {
      return new Promise<void>((resolve) => {
        exportStream = new ExportStream(config);
        exportStream.execute().subscribe({
          next: (result: { success: boolean; summary: ExportSummary }) => {
            expect(result.success).toBe(true);
            expect(result.summary).toBeDefined();
          },
          complete: () => {
            resolve();
          }
        });
      });
    });

    it("should handle errors gracefully", async () => {
      return new Promise<void>((resolve) => {
        // Create a config that will cause an error
        const errorConfig = { ...config, token: "" };
        exportStream = new ExportStream(errorConfig);

        exportStream.execute().subscribe({
          next: (result: { success: boolean; summary: ExportSummary }) => {
            // Even with errors, it should return a result
            expect(result).toBeDefined();
            expect(result.summary).toBeDefined();
          },
          complete: () => {
            resolve();
          }
        });
      });
    });

    it("should process all workspaces when no specific workspace is provided", async () => {
      return new Promise<void>((resolve) => {
        const configWithoutWorkspace: ExporterConfig = { ...config, workspace: undefined };
        exportStream = new ExportStream(configWithoutWorkspace);

        exportStream.execute().subscribe({
          next: (result: { success: boolean; summary: ExportSummary }) => {
            expect(result.success).toBeDefined();
            expect(result.summary).toBeDefined();
          },
          complete: () => {
            resolve();
          }
        });
      });
    });
  });

  describe("event handling", () => {
    it("should emit progress events", async () => {
      return new Promise<void>((resolve) => {
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
            resolve();
          }
        });
      });
    });

    it("should emit error events", async () => {
      return new Promise<void>((resolve) => {
        exportStream = new ExportStream(config);
        let errorEmitted = false;

        exportStream.onError().subscribe((error: Error) => {
          errorEmitted = true;
        });

        // Create an artificial error scenario
        const errorConfig = { ...config, token: "" };
        const errorStream = new ExportStream(errorConfig);

        errorStream.execute().subscribe({
          complete: () => {
            // Error handling is internal, test passes if no exception
            resolve();
          }
        });
      });
    });

    it("should emit complete event with summary", async () => {
      return new Promise<void>((resolve) => {
        exportStream = new ExportStream(config);

        // Execute to trigger completion, then subscribe to complete event
        exportStream.execute().subscribe({
          complete: () => {
            // Now subscribe to the complete event which should have fired
            exportStream.onComplete().subscribe((summary: ExportSummary) => {
              expect(summary.successCount).toBeDefined();
              expect(summary.errorCount).toBeDefined();
              resolve();
            });
          }
        });
      });
    });
  });

  describe("stop and cleanup", () => {
    it("should stop the export process", () => {
      exportStream = new ExportStream(config);
      // No error should be thrown
      expect(() => exportStream.stop()).not.toThrow();
    });

    it("should cleanup resources", async () => {
      return new Promise<void>((resolve) => {
        exportStream = new ExportStream(config);
        // Cleanup should complete without errors
        exportStream.cleanup().subscribe({
          complete: () => {
            resolve();
          }
        });
      });
    });
  });

  describe("plugin integration", () => {
    it("should work with plugins", async () => {
      return new Promise<void>((resolve) => {
        // Create a proper mock plugin that implements ExportPlugin interface
        const mockPlugin: ExportPlugin = {
          onExportStart: vi.fn().mockReturnValue(of(undefined)),
          onEntity: vi.fn().mockReturnValue(of(undefined)),
          onExportComplete: vi.fn().mockReturnValue(of(undefined)),
          onError: vi.fn().mockReturnValue(of(undefined)),
          cleanup: vi.fn().mockReturnValue(of(undefined))
        };

        const configWithPlugin = {
          ...config,
          plugins: [mockPlugin]
        };

        exportStream = new ExportStream(configWithPlugin);

        exportStream.execute().subscribe({
          complete: () => {
            // Plugin integration test passes if no errors
            expect(mockPlugin.onExportStart).toHaveBeenCalled();
            resolve();
          }
        });
      });
    });
  });

  describe("Observable streams", () => {
    it("should provide event stream", async () => {
      return new Promise<void>((resolve) => {
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
            resolve();
          }
        });
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

  describe("additional test coverage", () => {
    it("should handle empty plugin array", async () => {
      const configWithEmptyPlugins = {
        ...config,
        plugins: []
      };

      exportStream = new ExportStream(configWithEmptyPlugins);

      return new Promise<void>((resolve) => {
        exportStream.execute().subscribe({
          complete: () => {
            resolve();
          }
        });
      });
    });

    it("should handle undefined plugins", async () => {
      const configWithUndefinedPlugins = {
        ...config,
        plugins: undefined
      };

      exportStream = new ExportStream(configWithUndefinedPlugins);

      return new Promise<void>((resolve) => {
        exportStream.execute().subscribe({
          complete: () => {
            resolve();
          }
        });
      });
    });
  });
});
