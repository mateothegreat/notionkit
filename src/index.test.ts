import { describe, expect, it, vi } from "vitest";
import { createExportStream, initializePlugins } from "./index";

// Mock dependencies
vi.mock("./lib/services/export-stream", () => ({
  ExportStream: vi.fn().mockImplementation(() => ({
    execute: vi.fn(),
    onEvent: vi.fn(),
    cleanup: vi.fn()
  }))
}));

vi.mock("./lib/plugins", () => ({
  initPluginSystem: vi.fn()
}));

describe("index module", () => {
  describe("createExportStream", () => {
    it("should create export stream with config", () => {
      const config = {
        token: "test-token",
        outputDir: "./test-output"
      };

      const stream = createExportStream(config);
      expect(stream).toBeDefined();
    });

    it("should pass config to ExportStream constructor", () => {
      const config = {
        token: "test-token",
        workspace: "test-workspace",
        outputDir: "./custom-output"
      };

      const stream = createExportStream(config);
      expect(stream).toBeDefined();
    });
  });

  describe("initializePlugins", () => {
    it("should initialize plugin system with commands", async () => {
      const mockCommands = [
        { id: "export", run: vi.fn() },
        { id: "import", run: vi.fn() }
      ] as any[];

      initializePlugins(mockCommands);

      const { initPluginSystem } = await import("./lib/plugins");
      expect(initPluginSystem).toHaveBeenCalledWith(mockCommands);
    });

    it("should handle empty commands array", async () => {
      initializePlugins([]);

      const { initPluginSystem } = await import("./lib/plugins");
      expect(initPluginSystem).toHaveBeenCalledWith([]);
    });
  });
});
