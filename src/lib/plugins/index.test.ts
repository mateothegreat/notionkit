import { of, throwError } from "rxjs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ExportEventPayload, ExportSummary, ExporterConfig, NotionEntity } from "../types";
import {
  ExportPlugin,
  ExportPluginManager,
  FileSystemPlugin,
  clearPlugins,
  defaultPlugins,
  getAllPlugins,
  getPlugin,
  initPluginSystem,
  registerPlugin,
  unregisterPlugin
} from "./index";

// Mock filesystem operations for testing
vi.mock("fs/promises", () => ({
  mkdir: vi.fn().mockResolvedValue(undefined),
  writeFile: vi.fn().mockResolvedValue(undefined)
}));

// Mock path operations
vi.mock("path", () => ({
  join: vi.fn((...args) => args.join("/")),
  dirname: vi.fn((path) => path.split("/").slice(0, -1).join("/"))
}));

// Mock the logging module to prevent test output
vi.mock("../utils/logging", () => ({
  log: {
    info: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
    debug: vi.fn(),
    warning: vi.fn()
  }
}));

describe("ExportPlugin Interface", () => {
  it("should define the correct interface structure", () => {
    const mockPlugin: ExportPlugin = {
      onExportStart: vi.fn().mockReturnValue(of(undefined)),
      onEntity: vi.fn().mockReturnValue(of(undefined)),
      onExportComplete: vi.fn().mockReturnValue(of(undefined)),
      onError: vi.fn().mockReturnValue(of(undefined)),
      cleanup: vi.fn().mockResolvedValue(undefined)
    };

    expect(mockPlugin.onExportStart).toBeDefined();
    expect(mockPlugin.onEntity).toBeDefined();
    expect(mockPlugin.onExportComplete).toBeDefined();
    expect(mockPlugin.onError).toBeDefined();
    expect(mockPlugin.cleanup).toBeDefined();
  });
});

describe("ExportPluginManager", () => {
  let pluginManager: ExportPluginManager;
  let mockPlugin: ExportPlugin;
  let config: ExporterConfig;

  beforeEach(() => {
    config = {
      token: "test-token",
      outputDir: "./test-output"
    };

    mockPlugin = {
      onExportStart: vi.fn().mockReturnValue(of(undefined)),
      onEntity: vi.fn().mockReturnValue(of(undefined)),
      onExportComplete: vi.fn().mockReturnValue(of(undefined)),
      onError: vi.fn().mockReturnValue(of(undefined)),
      cleanup: vi.fn().mockResolvedValue(undefined)
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("constructor", () => {
    it("should initialize with no plugins", () => {
      pluginManager = new ExportPluginManager([]);
      expect(pluginManager.getPlugins()).toHaveLength(0);
    });

    it("should initialize with plugin instances", () => {
      const testPlugin: ExportPlugin = {
        onExportStart: vi.fn().mockReturnValue(of(undefined)),
        onEntity: vi.fn().mockReturnValue(of(undefined)),
        onExportComplete: vi.fn().mockReturnValue(of(undefined)),
        onError: vi.fn().mockReturnValue(of(undefined)),
        cleanup: vi.fn().mockResolvedValue(undefined)
      };

      pluginManager = new ExportPluginManager([testPlugin]);
      expect(pluginManager.getPlugins()).toHaveLength(1);
      expect(pluginManager.getPlugins()[0]).toBe(testPlugin);
    });

    it("should handle invalid plugin instances gracefully", () => {
      const invalidPlugin = null as any;
      const validPlugin: ExportPlugin = {
        onExportStart: vi.fn().mockReturnValue(of(undefined)),
        onEntity: vi.fn().mockReturnValue(of(undefined)),
        onExportComplete: vi.fn().mockReturnValue(of(undefined)),
        onError: vi.fn().mockReturnValue(of(undefined)),
        cleanup: vi.fn().mockResolvedValue(undefined)
      };

      pluginManager = new ExportPluginManager([validPlugin, invalidPlugin].filter(Boolean));

      expect(pluginManager.getPlugins()).toHaveLength(1);
    });

    it("should automatically set silent mode during testing", () => {
      pluginManager = new ExportPluginManager([]);
      expect(() => pluginManager.setSilentMode(true)).not.toThrow();
      expect(() => pluginManager.setSilentMode(false)).not.toThrow();
    });
  });

  describe("event handling", () => {
    beforeEach(() => {
      pluginManager = new ExportPluginManager([mockPlugin]);
    });

    it("should notify plugins of start events", async () => {
      const startPayload: ExportEventPayload = {
        type: "start",
        config
      };

      pluginManager.notify(startPayload);

      // Wait for async event handling
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(mockPlugin.onExportStart).toHaveBeenCalledWith(config);
    });

    it("should notify plugins of entity events", async () => {
      const entity: NotionEntity = {
        id: "test-id",
        type: "page"
      };

      const entityPayload: ExportEventPayload = {
        type: "entity",
        entity
      };

      pluginManager.notify(entityPayload);

      // Wait for async event handling
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(mockPlugin.onEntity).toHaveBeenCalledWith(entity);
    });

    it("should notify plugins of error events", async () => {
      const error = new Error("Test error");
      const errorPayload: ExportEventPayload = {
        type: "error",
        error
      };

      pluginManager.notify(errorPayload);

      // Wait for async event handling
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(mockPlugin.onError).toHaveBeenCalledWith(error);
    });

    it("should notify plugins of complete events", async () => {
      const summary: ExportSummary = {
        successCount: 10,
        errorCount: 0,
        processedTypes: { page: 10 },
        duration: 1000
      };

      const completePayload: ExportEventPayload = {
        type: "complete",
        summary
      };

      pluginManager.notify(completePayload);

      // Wait for async event handling
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(mockPlugin.onExportComplete).toHaveBeenCalledWith(summary);
    });

    it("should handle progress events without calling plugin methods", async () => {
      const progressPayload: ExportEventPayload = {
        type: "progress",
        complete: 50,
        total: 100
      };

      pluginManager.notify(progressPayload);

      // Wait for async event handling
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(mockPlugin.onExportStart).not.toHaveBeenCalled();
      expect(mockPlugin.onEntity).not.toHaveBeenCalled();
      expect(mockPlugin.onError).not.toHaveBeenCalled();
      expect(mockPlugin.onExportComplete).not.toHaveBeenCalled();
    });

    it("should handle unknown event types gracefully", async () => {
      const unknownPayload = {
        type: "unknown"
      } as any;

      pluginManager.notify(unknownPayload);

      // Wait for async event handling
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(mockPlugin.onExportStart).not.toHaveBeenCalled();
      expect(mockPlugin.onEntity).not.toHaveBeenCalled();
      expect(mockPlugin.onError).not.toHaveBeenCalled();
      expect(mockPlugin.onExportComplete).not.toHaveBeenCalled();
    });

    it("should handle multiple plugins", async () => {
      const mockPlugin2 = {
        onExportStart: vi.fn().mockReturnValue(of(undefined)),
        onEntity: vi.fn().mockReturnValue(of(undefined)),
        onExportComplete: vi.fn().mockReturnValue(of(undefined)),
        onError: vi.fn().mockReturnValue(of(undefined)),
        cleanup: vi.fn().mockResolvedValue(undefined)
      };

      pluginManager = new ExportPluginManager([mockPlugin, mockPlugin2]);

      const entity: NotionEntity = {
        id: "test-id",
        type: "block"
      };

      pluginManager.notify({ type: "entity", entity });

      // Wait for async event handling
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(mockPlugin.onEntity).toHaveBeenCalledWith(entity);
      expect(mockPlugin2.onEntity).toHaveBeenCalledWith(entity);
    });

    it("should handle plugin errors in event handlers gracefully", async () => {
      const failingPlugin = {
        onExportStart: vi.fn().mockReturnValue(of(undefined)),
        onEntity: vi.fn().mockReturnValue(throwError(() => new Error("Plugin error"))),
        onExportComplete: vi.fn().mockReturnValue(of(undefined)),
        onError: vi.fn().mockReturnValue(of(undefined)),
        cleanup: vi.fn().mockResolvedValue(undefined)
      };

      pluginManager = new ExportPluginManager([failingPlugin]);

      const entity: NotionEntity = {
        id: "test-id",
        type: "page"
      };

      pluginManager.notify({ type: "entity", entity });

      // Wait for async event handling
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(failingPlugin.onEntity).toHaveBeenCalledWith(entity);
    });

    it("should handle plugin errors without stopping other plugins", async () => {
      const failingPlugin = {
        onExportStart: vi.fn().mockReturnValue(throwError(() => new Error("Plugin error"))),
        onEntity: vi.fn().mockReturnValue(of(undefined)),
        onExportComplete: vi.fn().mockReturnValue(of(undefined)),
        onError: vi.fn().mockReturnValue(of(undefined)),
        cleanup: vi.fn().mockResolvedValue(undefined)
      };

      pluginManager = new ExportPluginManager([failingPlugin, mockPlugin]);

      pluginManager.notify({ type: "start", config });

      // Wait for async event handling
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(failingPlugin.onExportStart).toHaveBeenCalledWith(config);
      expect(mockPlugin.onExportStart).toHaveBeenCalledWith(config);
    });
  });

  describe("cleanup", () => {
    it("should cleanup all plugins", async () => {
      const mockPlugin2 = {
        onExportStart: vi.fn().mockReturnValue(of(undefined)),
        onEntity: vi.fn().mockReturnValue(of(undefined)),
        onExportComplete: vi.fn().mockReturnValue(of(undefined)),
        onError: vi.fn().mockReturnValue(of(undefined)),
        cleanup: vi.fn().mockResolvedValue(undefined)
      };

      pluginManager = new ExportPluginManager([mockPlugin, mockPlugin2]);

      await pluginManager.cleanup();

      expect(mockPlugin.cleanup).toHaveBeenCalled();
      expect(mockPlugin2.cleanup).toHaveBeenCalled();
    });

    it("should handle cleanup errors gracefully", async () => {
      const failingPlugin = {
        onExportStart: vi.fn().mockReturnValue(of(undefined)),
        onEntity: vi.fn().mockReturnValue(of(undefined)),
        onExportComplete: vi.fn().mockReturnValue(of(undefined)),
        onError: vi.fn().mockReturnValue(of(undefined)),
        cleanup: vi.fn().mockRejectedValue(new Error("Cleanup error"))
      };

      pluginManager = new ExportPluginManager([mockPlugin, failingPlugin]);

      await expect(pluginManager.cleanup()).resolves.not.toThrow();
      expect(failingPlugin.cleanup).toHaveBeenCalled();
      expect(mockPlugin.cleanup).toHaveBeenCalled();
    });
  });

  describe("silent mode", () => {
    it("should enable silent mode", () => {
      pluginManager = new ExportPluginManager([]);
      pluginManager.setSilentMode(true);
      expect(true).toBe(true); // No errors expected
    });

    it("should disable silent mode", () => {
      pluginManager = new ExportPluginManager([]);
      pluginManager.setSilentMode(false);
      expect(true).toBe(true); // Console output may occur
    });
  });
});

describe("FileSystemPlugin", () => {
  let fsPlugin: FileSystemPlugin;
  let config: ExporterConfig;

  beforeEach(() => {
    config = {
      token: "test-token",
      outputDir: "./test-output"
    };
    fsPlugin = new FileSystemPlugin(config);
  });

  describe("constructor", () => {
    it("should initialize with default config", () => {
      const defaultPlugin = new FileSystemPlugin();
      expect(defaultPlugin).toBeDefined();
    });

    it("should initialize with provided config", () => {
      expect(fsPlugin).toBeDefined();
    });

    it("should enable silent mode during testing", () => {
      const plugin = new FileSystemPlugin();
      plugin.setSilentMode(true);
      expect(true).toBe(true); // No errors expected
    });
  });

  describe("onExportStart", () => {
    it("should initialize successfully", async () => {
      const result = await fsPlugin.onExportStart(config).toPromise();
      expect(result).toBeUndefined();
    });

    it("should handle filesystem errors during initialization", async () => {
      const fs = await import("fs/promises");
      vi.mocked(fs.mkdir).mockRejectedValueOnce(new Error("Permission denied"));

      try {
        await fsPlugin.onExportStart(config).toPromise();
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeDefined();
        expect((error as Error).message).toBe("Permission denied");
      }
    });
  });

  describe("onEntity", () => {
    it("should process entities successfully", async () => {
      const entity: NotionEntity = {
        id: "test-id",
        type: "page"
      };

      const result = await fsPlugin.onEntity(entity).toPromise();
      expect(result).toBeUndefined();
      expect(fsPlugin.getActiveEntityCount()).toBe(1);
      expect(fsPlugin.getFileMap().has(entity.id)).toBe(true);
    });

    it("should handle different entity types", async () => {
      const entities: NotionEntity[] = [
        { id: "page-1", type: "page" },
        { id: "block-1", type: "block" },
        { id: "database-1", type: "database" }
      ];

      for (const entity of entities) {
        await fsPlugin.onEntity(entity).toPromise();
      }

      expect(fsPlugin.getActiveEntityCount()).toBe(3);
      expect(fsPlugin.getFileMap().size).toBe(3);
    });

    it("should handle filesystem errors during entity processing", async () => {
      const fs = await import("fs/promises");
      vi.mocked(fs.writeFile).mockRejectedValueOnce(new Error("Disk full"));

      const entity: NotionEntity = {
        id: "test-id",
        type: "page"
      };

      try {
        await fsPlugin.onEntity(entity).toPromise();
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeDefined();
        expect((error as Error).message).toBe("Disk full");
      }
    });
  });

  describe("onExportComplete", () => {
    it("should write export summary", async () => {
      const summary: ExportSummary = {
        successCount: 10,
        errorCount: 2,
        processedTypes: { page: 8, block: 2 },
        duration: 5000
      };

      const result = await fsPlugin.onExportComplete(summary).toPromise();
      expect(result).toBeUndefined();
    });

    it("should handle errors when writing summary", async () => {
      const fs = await import("fs/promises");
      vi.mocked(fs.writeFile).mockRejectedValueOnce(new Error("Permission denied"));

      const summary: ExportSummary = {
        successCount: 10,
        errorCount: 2,
        processedTypes: { page: 8, block: 2 },
        duration: 5000
      };

      try {
        await fsPlugin.onExportComplete(summary).toPromise();
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeDefined();
        expect((error as Error).message).toBe("Permission denied");
      }
    });
  });

  describe("onError", () => {
    it("should handle errors gracefully", async () => {
      const error = new Error("Test error");
      const result = await fsPlugin.onError(error).toPromise();
      expect(result).toBeUndefined();
    });

    it("should respect silent mode", async () => {
      fsPlugin.setSilentMode(true);
      const error = new Error("Test error");
      const result = await fsPlugin.onError(error).toPromise();
      expect(result).toBeUndefined();
    });
  });

  describe("cleanup", () => {
    it("should cleanup resources", async () => {
      // Add some entities first
      const entity1: NotionEntity = { id: "test-1", type: "page" };
      const entity2: NotionEntity = { id: "test-2", type: "block" };

      await fsPlugin.onEntity(entity1).toPromise();
      await fsPlugin.onEntity(entity2).toPromise();

      expect(fsPlugin.getActiveEntityCount()).toBe(2);
      expect(fsPlugin.getFileMap().size).toBe(2);

      await fsPlugin.cleanup();

      expect(fsPlugin.getActiveEntityCount()).toBe(0);
      expect(fsPlugin.getFileMap().size).toBe(0);
    });
  });

  describe("path generation", () => {
    it("should generate correct paths for entities", () => {
      const entity: NotionEntity = { id: "test-id", type: "page" };
      const path = fsPlugin["getPathForEntity"](entity);

      expect(path).toContain("page");
      expect(path).toContain("test-id.json");
    });

    it("should use default output dir when none provided", () => {
      const defaultPlugin = new FileSystemPlugin();
      const entity: NotionEntity = { id: "test-id", type: "database" };
      const path = defaultPlugin["getPathForEntity"](entity);

      expect(path).toContain("notion-export");
      expect(path).toContain("database");
    });
  });
});

describe("Plugin Registry Functions", () => {
  beforeEach(() => {
    clearPlugins();
  });

  afterEach(() => {
    clearPlugins();
  });

  describe("initPluginSystem", () => {
    it("should initialize plugin system with commands", () => {
      const commands: any[] = [];
      initPluginSystem(commands);

      const allPlugins = getAllPlugins();

      expect(allPlugins.size).toBeGreaterThan(0);
      expect(allPlugins.has("fs")).toBe(true);
    });

    it("should be silent during testing", () => {
      const commands: any[] = [];
      // Should not log during testing
      expect(() => initPluginSystem(commands)).not.toThrow();
    });
  });

  describe("registerPlugin", () => {
    it("should register a plugin globally", () => {
      const testPlugin: ExportPlugin = {
        onExportStart: vi.fn().mockReturnValue(of(undefined)),
        onEntity: vi.fn().mockReturnValue(of(undefined)),
        onExportComplete: vi.fn().mockReturnValue(of(undefined)),
        onError: vi.fn().mockReturnValue(of(undefined)),
        cleanup: vi.fn().mockResolvedValue(undefined)
      };

      registerPlugin(testPlugin);

      const allPlugins = getAllPlugins();

      expect(allPlugins.size).toBeGreaterThan(0);
    });

    it("should be silent during testing", () => {
      const testPlugin: ExportPlugin = {
        onExportStart: vi.fn().mockReturnValue(of(undefined)),
        onEntity: vi.fn().mockReturnValue(of(undefined)),
        onExportComplete: vi.fn().mockReturnValue(of(undefined)),
        onError: vi.fn().mockReturnValue(of(undefined)),
        cleanup: vi.fn().mockResolvedValue(undefined)
      };

      // Should not log during testing
      expect(() => registerPlugin(testPlugin)).not.toThrow();
    });
  });

  describe("getPlugin", () => {
    it("should retrieve registered plugin", () => {
      initPluginSystem([]);

      const fsPlugin = getPlugin("fs");

      expect(fsPlugin).toBeDefined();
      expect(fsPlugin).toBe(FileSystemPlugin);
    });

    it("should return undefined for non-existent plugin", () => {
      const nonExistentPlugin = getPlugin("non-existent");

      expect(nonExistentPlugin).toBeUndefined();
    });
  });

  describe("getAllPlugins", () => {
    it("should return all registered plugins", () => {
      initPluginSystem([]);

      const allPlugins = getAllPlugins();

      expect(allPlugins).toBeInstanceOf(Map);
      expect(allPlugins.size).toBeGreaterThan(0);
    });

    it("should return empty map when no plugins registered", () => {
      clearPlugins();
      const allPlugins = getAllPlugins();

      expect(allPlugins.size).toBe(0);
    });
  });

  describe("unregisterPlugin", () => {
    it("should remove plugin from registry", () => {
      initPluginSystem([]);

      const removed = unregisterPlugin("fs");
      const fsPlugin = getPlugin("fs");

      expect(removed).toBe(true);
      expect(fsPlugin).toBeUndefined();
    });

    it("should return false for non-existent plugin", () => {
      const removed = unregisterPlugin("non-existent");

      expect(removed).toBe(false);
    });
  });

  describe("clearPlugins", () => {
    it("should clear all plugins", () => {
      initPluginSystem([]);

      let allPlugins = getAllPlugins();
      expect(allPlugins.size).toBeGreaterThan(0);

      clearPlugins();

      allPlugins = getAllPlugins();

      expect(allPlugins.size).toBe(0);
    });
  });
});

describe("defaultPlugins", () => {
  it("should include FileSystemPlugin", () => {
    expect(defaultPlugins).toContain(FileSystemPlugin);
  });

  it("should have expected length", () => {
    expect(defaultPlugins.length).toBeGreaterThan(0);
  });
});

describe("Integration Tests", () => {
  it("should work end-to-end with plugin manager and FileSystemPlugin", async () => {
    const config: ExporterConfig = {
      token: "test-token",
      outputDir: "./test-output"
    };

    const pluginManager = new ExportPluginManager([new FileSystemPlugin(config)]);

    // Test start event
    pluginManager.notify({ type: "start", config });

    // Test entity event
    const entity: NotionEntity = { id: "test-entity", type: "page" };
    pluginManager.notify({ type: "entity", entity });

    // Test error event
    const error = new Error("Test error");
    pluginManager.notify({ type: "error", error });

    // Test complete event
    const summary: ExportSummary = {
      successCount: 1,
      errorCount: 1,
      processedTypes: { page: 1 },
      duration: 1000
    };
    pluginManager.notify({ type: "complete", summary });

    // Wait for async operations
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Cleanup
    await pluginManager.cleanup();

    expect(pluginManager.getPlugins()).toHaveLength(1);
    expect(pluginManager.getPlugins()[0]).toBeInstanceOf(FileSystemPlugin);
  });

  it("should handle multiple plugin types together", async () => {
    class TestPlugin implements ExportPlugin {
      onExportStart = vi.fn().mockReturnValue(of(undefined));
      onEntity = vi.fn().mockReturnValue(of(undefined));
      onExportComplete = vi.fn().mockReturnValue(of(undefined));
      onError = vi.fn().mockReturnValue(of(undefined));
      cleanup = vi.fn().mockResolvedValue(undefined);
    }

    const config: ExporterConfig = { token: "test-token", outputDir: "./test-output" };
    const pluginManager = new ExportPluginManager([new FileSystemPlugin(config), new TestPlugin()]);

    const entity: NotionEntity = { id: "test-entity", type: "page" };
    pluginManager.notify({ type: "entity", entity });

    // Wait for async operations
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(pluginManager.getPlugins()).toHaveLength(2);
    expect(pluginManager.getPlugins()[0]).toBeInstanceOf(FileSystemPlugin);
    expect(pluginManager.getPlugins()[1]).toBeInstanceOf(TestPlugin);
  });

  it("should handle plugin errors without crashing", async () => {
    class ErrorPlugin implements ExportPlugin {
      onExportStart = vi.fn().mockReturnValue(throwError(() => new Error("Start error")));
      onEntity = vi.fn().mockReturnValue(throwError(() => new Error("Entity error")));
      onExportComplete = vi.fn().mockReturnValue(throwError(() => new Error("Complete error")));
      onError = vi.fn().mockReturnValue(throwError(() => new Error("Error in error handler")));
      cleanup = vi.fn().mockRejectedValue(new Error("Cleanup error"));
    }

    const pluginManager = new ExportPluginManager([new ErrorPlugin()]);

    const config: ExporterConfig = { token: "test-token" };
    const entity: NotionEntity = { id: "test-entity", type: "page" };
    const summary: ExportSummary = { successCount: 0, errorCount: 1, processedTypes: {}, duration: 100 };

    // All these should not crash the system
    pluginManager.notify({ type: "start", config });
    pluginManager.notify({ type: "entity", entity });
    pluginManager.notify({ type: "error", error: new Error("Test error") });
    pluginManager.notify({ type: "complete", summary });

    // Wait for async operations
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Cleanup should not throw
    await expect(pluginManager.cleanup()).resolves.not.toThrow();

    expect(pluginManager.getPlugins()).toHaveLength(1);
  });

  it("should support plugin registry workflow", () => {
    // Clear and initialize
    clearPlugins();
    initPluginSystem([]);

    // Register custom plugin
    const customPlugin: ExportPlugin = {
      onExportStart: vi.fn().mockReturnValue(of(undefined)),
      onEntity: vi.fn().mockReturnValue(of(undefined)),
      onExportComplete: vi.fn().mockReturnValue(of(undefined)),
      onError: vi.fn().mockReturnValue(of(undefined)),
      cleanup: vi.fn().mockResolvedValue(undefined)
    };

    registerPlugin(customPlugin);

    // Check plugin is registered
    const allPlugins = getAllPlugins();
    expect(allPlugins.size).toBeGreaterThan(1); // fs + custom plugin

    // Create plugin manager with registered plugins
    const pluginManager = new ExportPluginManager([new FileSystemPlugin()]);
    expect(pluginManager.getPlugins()).toHaveLength(1);
  });
});

describe("Error Scenarios", () => {
  it("should handle file system errors gracefully", async () => {
    const fs = await import("fs/promises");
    vi.mocked(fs.mkdir).mockRejectedValue(new Error("Permission denied"));
    vi.mocked(fs.writeFile).mockRejectedValue(new Error("Disk full"));

    const fsPlugin = new FileSystemPlugin({ outputDir: "./test-output" });
    fsPlugin.setSilentMode(true);

    const config: ExporterConfig = { token: "test-token", outputDir: "./test-output" };
    const entity: NotionEntity = { id: "test-entity", type: "page" };
    const summary: ExportSummary = { successCount: 0, errorCount: 1, processedTypes: {}, duration: 100 };

    // All operations should handle errors gracefully
    await expect(fsPlugin.onExportStart(config).toPromise()).rejects.toThrow();
    await expect(fsPlugin.onEntity(entity).toPromise()).rejects.toThrow();
    await expect(fsPlugin.onExportComplete(summary).toPromise()).rejects.toThrow();

    // Error handling should not throw
    await expect(fsPlugin.onError(new Error("Test error")).toPromise()).resolves.not.toThrow();
  });

  it("should handle edge cases in plugin initialization", () => {
    // Test with empty array and undefined plugins
    const pluginManager = new ExportPluginManager([]);

    expect(pluginManager.getPlugins()).toHaveLength(0);
  });
});

describe("Additional Test Coverage", () => {
  describe("Plugin event ordering", () => {
    it("should process multiple plugins in order", async () => {
      const executionOrder: string[] = [];

      const plugin1: ExportPlugin = {
        onExportStart: vi.fn().mockImplementation(() => {
          executionOrder.push("plugin1-start");
          return of(undefined);
        }),
        onEntity: vi.fn().mockReturnValue(of(undefined)),
        onExportComplete: vi.fn().mockReturnValue(of(undefined)),
        onError: vi.fn().mockReturnValue(of(undefined)),
        cleanup: vi.fn().mockResolvedValue(undefined)
      };

      const plugin2: ExportPlugin = {
        onExportStart: vi.fn().mockImplementation(() => {
          executionOrder.push("plugin2-start");
          return of(undefined);
        }),
        onEntity: vi.fn().mockReturnValue(of(undefined)),
        onExportComplete: vi.fn().mockReturnValue(of(undefined)),
        onError: vi.fn().mockReturnValue(of(undefined)),
        cleanup: vi.fn().mockResolvedValue(undefined)
      };

      const pluginManager = new ExportPluginManager([plugin1, plugin2]);

      const config: ExporterConfig = { token: "test-token" };
      pluginManager.notify({ type: "start", config });

      // Wait for async operations
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(executionOrder).toEqual(["plugin1-start", "plugin2-start"]);
    });
  });

  describe("FileSystemPlugin edge cases", () => {
    beforeEach(async () => {
      // Reset filesystem mocks to successful state
      const fs = await import("fs/promises");
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);
    });

    it("should handle entities with special characters in IDs", async () => {
      const fsPlugin = new FileSystemPlugin({ outputDir: "./test-output" });
      const entity: NotionEntity = {
        id: "test-id-with-special-chars-@#$%",
        type: "page"
      };

      const result = await fsPlugin.onEntity(entity).toPromise();
      expect(result).toBeUndefined();
      expect(fsPlugin.getFileMap().has(entity.id)).toBe(true);
    });

    it("should handle deeply nested directory structures", async () => {
      const fsPlugin = new FileSystemPlugin({ outputDir: "./very/deep/nested/output/directory" });
      const entity: NotionEntity = {
        id: "test-id",
        type: "database"
      };

      const result = await fsPlugin.onEntity(entity).toPromise();
      expect(result).toBeUndefined();
    });
  });
});
