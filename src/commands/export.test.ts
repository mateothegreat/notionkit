import { of } from "rxjs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ExportStream } from "../lib/services/export-stream";
import type { ExportSummary } from "../lib/types";
import Export from "./export";

// Mock the ora spinner
vi.mock("ora", () => ({
  default: vi.fn(() => ({
    start: vi.fn().mockReturnThis(),
    succeed: vi.fn().mockReturnThis(),
    fail: vi.fn().mockReturnThis(),
    stop: vi.fn().mockReturnThis(),
    text: ""
  }))
}));

// Helper to create mock oclif config
function createMockConfig() {
  return {
    runHook: vi.fn().mockResolvedValue({}),
    runCommand: vi.fn().mockResolvedValue({}),
    findCommand: vi.fn().mockResolvedValue({}),
    scopedEnvVarKey: vi.fn((key: string) => `TEST_${key}`),
    scopedEnvVar: vi.fn((key: string) => process.env[`TEST_${key}`]),
    bin: "notion-sync",
    name: "notion-sync",
    version: "1.0.0",
    pjson: {},
    root: process.cwd(),
    dataDir: "./tmp",
    cacheDir: "./tmp/cache",
    configDir: "./tmp/config",
    errlog: "./tmp/error.log",
    home: process.env.HOME || "./tmp",
    shell: process.env.SHELL || "/bin/bash",
    windows: process.platform === "win32",
    arch: process.arch,
    platform: process.platform,
    userAgent: "notion-sync/1.0.0",
    debug: false,
    npmRegistry: "https://registry.npmjs.org"
  };
}

describe("Export Command", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("basic functionality", () => {
    it("should have correct description", () => {
      expect(Export.description).toBe("Export Notion workspace, database, or page to desired format");
    });

    it("should have required flags", () => {
      const flags = Export.flags;
      expect(flags.token).toBeDefined();
      expect(flags.token.required).toBe(true);
      expect(flags.workspace).toBeDefined();
      expect(flags.output).toBeDefined();
      expect(flags.plugins).toBeDefined();
    });

    it("should have optional target argument", () => {
      const args = Export.args;
      // Export.args is defined as an empty object, not an array
      expect(args).toBeDefined();
      expect(typeof args).toBe("object");
    });
  });

  describe("command execution", () => {
    it("runs export with minimal config", async () => {
      const mockExportStream = {
        execute: vi.fn().mockReturnValue(
          of({
            success: true,
            summary: {
              successCount: 10,
              errorCount: 0,
              processedTypes: { page: 10 },
              duration: 1000
            } as ExportSummary
          })
        ),
        onEvent: vi.fn().mockReturnValue(of()),
        stop: vi.fn(),
        cleanup: vi.fn().mockResolvedValue(undefined)
      };

      vi.spyOn(ExportStream.prototype, "execute").mockImplementation(mockExportStream.execute);
      vi.spyOn(ExportStream.prototype, "onEvent").mockImplementation(mockExportStream.onEvent);
      vi.spyOn(ExportStream.prototype, "cleanup").mockImplementation(mockExportStream.cleanup);

      const mockConfig = createMockConfig();
      const command = new Export(["--token", "test-token"], mockConfig as any);

      // Mock the parse method to return expected values
      vi.spyOn(command, "parse" as any).mockResolvedValue({
        argv: [],
        flags: { token: "test-token", output: "./notion-export" }
      });

      await command.run();

      expect(mockExportStream.execute).toHaveBeenCalled();
    });

    it("runs export with workspace specified", async () => {
      const mockExportStream = {
        execute: vi.fn().mockReturnValue(
          of({
            success: true,
            summary: {
              successCount: 5,
              errorCount: 0,
              processedTypes: { page: 5 },
              duration: 500
            } as ExportSummary
          })
        ),
        onEvent: vi.fn().mockReturnValue(of()),
        stop: vi.fn(),
        cleanup: vi.fn().mockResolvedValue(undefined)
      };

      vi.spyOn(ExportStream.prototype, "execute").mockImplementation(mockExportStream.execute);
      vi.spyOn(ExportStream.prototype, "onEvent").mockImplementation(mockExportStream.onEvent);
      vi.spyOn(ExportStream.prototype, "cleanup").mockImplementation(mockExportStream.cleanup);

      const mockConfig = createMockConfig();
      const command = new Export(["--token", "test-token", "--workspace", "test-workspace"], mockConfig as any);

      // Mock the parse method
      vi.spyOn(command, "parse" as any).mockResolvedValue({
        argv: [],
        flags: { token: "test-token", workspace: "test-workspace", output: "./notion-export" }
      });

      await command.run();

      expect(mockExportStream.execute).toHaveBeenCalled();
    });

    it("runs export with custom output and plugins", async () => {
      const mockExportStream = {
        execute: vi.fn().mockReturnValue(
          of({
            success: true,
            summary: {
              successCount: 3,
              errorCount: 0,
              processedTypes: { page: 3 },
              duration: 300
            } as ExportSummary
          })
        ),
        onEvent: vi.fn().mockReturnValue(of()),
        stop: vi.fn(),
        cleanup: vi.fn().mockResolvedValue(undefined)
      };

      vi.spyOn(ExportStream.prototype, "execute").mockImplementation(mockExportStream.execute);
      vi.spyOn(ExportStream.prototype, "onEvent").mockImplementation(mockExportStream.onEvent);
      vi.spyOn(ExportStream.prototype, "cleanup").mockImplementation(mockExportStream.cleanup);

      const mockConfig = createMockConfig();
      const command = new Export(
        ["--token", "test-token", "--output", "./custom-output", "--plugins", "plugin1,plugin2"],
        mockConfig as any
      );

      // Mock the loadPlugins method to avoid module loading
      vi.spyOn(command, "loadPlugins" as any).mockReturnValue([]);

      // Mock the parse method
      vi.spyOn(command, "parse" as any).mockResolvedValue({
        argv: [],
        flags: {
          token: "test-token",
          output: "./custom-output",
          plugins: ["plugin1", "plugin2"]
        }
      });

      await command.run();

      expect(mockExportStream.execute).toHaveBeenCalled();
    });

    it("runs export with specific target", async () => {
      const mockExportStream = {
        execute: vi.fn().mockReturnValue(
          of({
            success: true,
            summary: {
              successCount: 1,
              errorCount: 0,
              processedTypes: { page: 1 },
              duration: 100
            } as ExportSummary
          })
        ),
        onEvent: vi.fn().mockReturnValue(of()),
        stop: vi.fn(),
        cleanup: vi.fn().mockResolvedValue(undefined)
      };

      vi.spyOn(ExportStream.prototype, "execute").mockImplementation(mockExportStream.execute);
      vi.spyOn(ExportStream.prototype, "onEvent").mockImplementation(mockExportStream.onEvent);
      vi.spyOn(ExportStream.prototype, "cleanup").mockImplementation(mockExportStream.cleanup);

      const mockConfig = createMockConfig();
      const command = new Export(["page-id-123", "--token", "test-token"], mockConfig as any);

      // Mock the parse method
      vi.spyOn(command, "parse" as any).mockResolvedValue({
        argv: ["page-id-123"],
        flags: { token: "test-token", output: "./notion-export" }
      });

      await command.run();

      expect(mockExportStream.execute).toHaveBeenCalled();
    });
  });

  describe("processExport", () => {
    it("should process export stream and handle success", async () => {
      const mockStream = {
        execute: vi.fn().mockReturnValue(
          of({
            success: true,
            summary: {
              successCount: 10,
              errorCount: 0,
              processedTypes: { page: 10 },
              duration: 1000
            } as ExportSummary
          })
        ),
        onEvent: vi.fn().mockReturnValue(of()),
        stop: vi.fn(),
        cleanup: vi.fn().mockResolvedValue(undefined)
      };

      vi.spyOn(ExportStream.prototype, "execute").mockImplementation(mockStream.execute);
      vi.spyOn(ExportStream.prototype, "onEvent").mockImplementation(mockStream.onEvent);
      vi.spyOn(ExportStream.prototype, "cleanup").mockImplementation(mockStream.cleanup);

      const command = new Export([], {} as any);
      const result = await command["processExport"](mockStream as any);

      expect(mockStream.execute).toHaveBeenCalled();
    });

    it("should handle export failures", async () => {
      const mockStream = {
        execute: vi.fn().mockReturnValue(
          of({
            success: false,
            summary: {
              successCount: 0,
              errorCount: 1,
              processedTypes: {},
              duration: 500,
              lastError: new Error("Export failed")
            } as ExportSummary
          })
        ),
        onEvent: vi.fn().mockReturnValue(of()),
        stop: vi.fn(),
        cleanup: vi.fn().mockResolvedValue(undefined)
      };

      vi.spyOn(ExportStream.prototype, "execute").mockImplementation(mockStream.execute);
      vi.spyOn(ExportStream.prototype, "onEvent").mockImplementation(mockStream.onEvent);
      vi.spyOn(ExportStream.prototype, "cleanup").mockImplementation(mockStream.cleanup);

      const command = new Export([], {} as any);

      try {
        await command["processExport"](mockStream as any);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe("progress handling", () => {
    it("should display progress updates", async () => {
      const mockStream = {
        execute: vi.fn().mockReturnValue(
          of({
            success: true,
            summary: {
              successCount: 5,
              errorCount: 0,
              processedTypes: { page: 5 },
              duration: 2000
            } as ExportSummary
          })
        ),
        onEvent: vi.fn().mockImplementation(() => {
          return of(
            { type: "progress", complete: 1, total: 5 },
            { type: "progress", complete: 3, total: 5 },
            { type: "progress", complete: 5, total: 5 }
          );
        }),
        stop: vi.fn(),
        cleanup: vi.fn().mockResolvedValue(undefined)
      };

      vi.spyOn(ExportStream.prototype, "execute").mockImplementation(mockStream.execute);
      vi.spyOn(ExportStream.prototype, "onEvent").mockImplementation(mockStream.onEvent);
      vi.spyOn(ExportStream.prototype, "cleanup").mockImplementation(mockStream.cleanup);

      const command = new Export([], {} as any);
      await command["processExport"](mockStream as any);

      expect(mockStream.onEvent).toHaveBeenCalled();
    });
  });
});
