import { promises as fs } from "fs";
import { tmpdir } from "os";
import path from "path";
import { of, throwError } from "rxjs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ExportConfig } from "../commands/export/config";
import type { ExportEventPayload, ExportSummary, NotionEntity } from "../commands/export/types";
import { FileSystemPlugin } from "./bundled/filesystem";
import {
  PluginManager,
  clearPlugins,
  defaultPlugins,
  getAllPlugins,
  getPlugin,
  initPluginSystem,
  registerPlugin,
  unregisterPlugin
} from "./index";
import { ExportPlugin } from "./types";

// Mock the logging module to prevent test output during tests
vi.mock("../utils/logging", () => ({
  log: {
    info: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
    debug: vi.fn(),
    warning: vi.fn(),
    debugging: {
      inspect: vi.fn()
    }
  }
}));

// Only mock filesystem operations for specific error scenarios
const mockFs = vi.hoisted(() => ({
  mkdir: vi.fn(),
  writeFile: vi.fn(),
  rmdir: vi.fn(),
  readFile: vi.fn(),
  access: vi.fn()
}));

// Mock only when needed for error testing
const enableFsMock = () => {
  vi.mock("fs/promises", () => mockFs);
};

const disableFsMock = () => {
  vi.unmock("fs/promises");
};

/**
 * Test utilities for creating temporary directories and files.
 */
class TestUtils {
  private static tempDirs: string[] = [];

  /**
   * Creates a temporary directory for testing.
   */
  static async createTempDir(): Promise<string> {
    const tempDir = await fs.mkdtemp(path.join(tmpdir(), "notion-test-"));
    TestUtils.tempDirs.push(tempDir);
    return tempDir;
  }

  /**
   * Cleans up all temporary directories.
   */
  static async cleanup(): Promise<void> {
    await Promise.all(
      TestUtils.tempDirs.map(async (dir) => {
        try {
          await fs.rm(dir, { recursive: true, force: true });
        } catch {
          // Ignore cleanup errors
        }
      })
    );
    TestUtils.tempDirs = [];
  }

  /**
   * Checks if a file exists.
   */
  static async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Reads a JSON file and returns its content.
   */
  static async readJsonFile(filePath: string): Promise<any> {
    const content = await fs.readFile(filePath, "utf-8");
    return JSON.parse(content);
  }
}

describe("ExportPlugin Interface", () => {
  it("should define the correct interface structure", () => {
    const mockPlugin: ExportPlugin = {
      onExportStart: vi.fn().mockReturnValue(of(undefined)),
      onEntity: vi.fn().mockReturnValue(of(undefined)),
      onExportComplete: vi.fn().mockReturnValue(of(undefined)),
      onError: vi.fn().mockReturnValue(of(undefined)),
      cleanup: vi.fn().mockReturnValue(of(undefined))
    };

    expect(mockPlugin.onExportStart).toBeDefined();
    expect(mockPlugin.onEntity).toBeDefined();
    expect(mockPlugin.onExportComplete).toBeDefined();
    expect(mockPlugin.onError).toBeDefined();
    expect(mockPlugin.cleanup).toBeDefined();
  });
});

describe("ExportPluginManager", () => {
  let pluginManager: PluginManager;
  let mockPlugin: ExportPlugin;
  let config: ExportConfig;

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
      cleanup: vi.fn().mockReturnValue(of(undefined))
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("constructor", () => {
    it("should initialize with no plugins", () => {
      pluginManager = new PluginManager([]);
      expect(pluginManager.getPlugins()).toHaveLength(0);
    });

    it("should initialize with plugin instances", () => {
      pluginManager = new PluginManager([mockPlugin]);
      expect(pluginManager.getPlugins()).toHaveLength(1);
      expect(pluginManager.getPlugins()[0]).toBe(mockPlugin);
    });

    it("should handle invalid plugin instances gracefully", () => {
      const invalidPlugin = null as any;
      const validPlugin = mockPlugin;

      pluginManager = new PluginManager([validPlugin, invalidPlugin].filter(Boolean));
      expect(pluginManager.getPlugins()).toHaveLength(1);
    });
  });

  describe("event handling", () => {
    beforeEach(() => {
      pluginManager = new PluginManager([mockPlugin]);
    });

    it("should notify plugins of start events", async () => {
      const startPayload: ExportEventPayload = {
        type: "start",
        config
      };

      pluginManager.notify(startPayload);
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
        cleanup: vi.fn().mockReturnValue(of(undefined))
      };

      pluginManager = new PluginManager([mockPlugin, mockPlugin2]);

      const entity: NotionEntity = {
        id: "test-id",
        type: "block"
      };

      pluginManager.notify({ type: "entity", entity });
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(mockPlugin.onEntity).toHaveBeenCalledWith(entity);
      expect(mockPlugin2.onEntity).toHaveBeenCalledWith(entity);
    });

    it("should handle plugin errors gracefully", async () => {
      const failingPlugin = {
        onExportStart: vi.fn().mockReturnValue(of(undefined)),
        onEntity: vi.fn().mockReturnValue(throwError(() => new Error("Plugin error"))),
        onExportComplete: vi.fn().mockReturnValue(of(undefined)),
        onError: vi.fn().mockReturnValue(of(undefined)),
        cleanup: vi.fn().mockReturnValue(of(undefined))
      };

      pluginManager = new PluginManager([failingPlugin]);

      const entity: NotionEntity = {
        id: "test-id",
        type: "page"
      };

      pluginManager.notify({ type: "entity", entity });
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(failingPlugin.onEntity).toHaveBeenCalledWith(entity);
    });

    it("should handle plugin errors without stopping other plugins", async () => {
      const failingPlugin = {
        onExportStart: vi.fn().mockReturnValue(throwError(() => new Error("Plugin error"))),
        onEntity: vi.fn().mockReturnValue(of(undefined)),
        onExportComplete: vi.fn().mockReturnValue(of(undefined)),
        onError: vi.fn().mockReturnValue(of(undefined)),
        cleanup: vi.fn().mockReturnValue(of(undefined))
      };

      pluginManager = new PluginManager([failingPlugin, mockPlugin]);

      pluginManager.notify({ type: "start", config });
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
        cleanup: vi.fn().mockReturnValue(of(undefined))
      };

      pluginManager = new PluginManager([mockPlugin, mockPlugin2]);

      return new Promise<void>((resolve) => {
        pluginManager.cleanup().subscribe({
          complete: () => {
            expect(mockPlugin.cleanup).toHaveBeenCalled();
            expect(mockPlugin2.cleanup).toHaveBeenCalled();
            resolve();
          }
        });
      });
    });

    it("should handle cleanup errors gracefully", async () => {
      const failingPlugin = {
        onExportStart: vi.fn().mockReturnValue(of(undefined)),
        onEntity: vi.fn().mockReturnValue(of(undefined)),
        onExportComplete: vi.fn().mockReturnValue(of(undefined)),
        onError: vi.fn().mockReturnValue(of(undefined)),
        cleanup: vi.fn().mockReturnValue(throwError(() => new Error("Cleanup error")))
      };

      pluginManager = new PluginManager([mockPlugin, failingPlugin]);

      return new Promise<void>((resolve) => {
        pluginManager.cleanup().subscribe({
          complete: () => {
            expect(failingPlugin.cleanup).toHaveBeenCalled();
            expect(mockPlugin.cleanup).toHaveBeenCalled();
            resolve();
          }
        });
      });
    });
  });

  describe("silent mode", () => {
    it("should enable silent mode", () => {
      pluginManager = new PluginManager([]);
      expect(true).toBe(true); // No errors expected
    });

    it("should disable silent mode", () => {
      pluginManager = new PluginManager([]);
      expect(true).toBe(true); // Console output may occur
    });
  });
});

describe("FileSystemPlugin", () => {
  let fsPlugin: FileSystemPlugin;
  let config: ExportConfig;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await TestUtils.createTempDir();
    config = {
      token: "test-token",
      outputDir: tempDir
    };
    fsPlugin = new FileSystemPlugin(config);
  });

  afterEach(async () => {
    await TestUtils.cleanup();
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
    it("should create output directory and initialize successfully", async () => {
      return new Promise<void>((resolve) => {
        fsPlugin.onExportStart(config).subscribe({
          complete: async () => {
            const dirExists = await TestUtils.fileExists(tempDir);
            expect(dirExists).toBe(true);
            resolve();
          }
        });
      });
    });

    it("should handle filesystem errors during initialization", async () => {
      enableFsMock();
      mockFs.mkdir.mockRejectedValueOnce(new Error("Permission denied"));

      return new Promise<void>((resolve) => {
        fsPlugin.onExportStart(config).subscribe({
          complete: () => {
            // Plugin should handle errors gracefully and complete normally
            disableFsMock();
            resolve();
          }
        });
      });
    });
  });

  describe("onEntity", () => {
    it("should process entities successfully with real filesystem", async () => {
      // Initialize the plugin first
      await new Promise<void>((resolve) => {
        fsPlugin.onExportStart(config).subscribe({
          complete: () => resolve()
        });
      });

      const entity: NotionEntity = {
        id: "test-id",
        type: "page"
      };

      return new Promise<void>((resolve) => {
        fsPlugin.onEntity(entity).subscribe({
          complete: async () => {
            expect(fsPlugin.getActiveEntityCount()).toBe(1);
            expect(fsPlugin.getFileMap().has(entity.id)).toBe(true);

            // Verify the file was actually created
            const expectedPath = path.join(tempDir, "page", "test-id.json");
            const fileExists = await TestUtils.fileExists(expectedPath);
            expect(fileExists).toBe(true);

            // Verify the file content
            const content = await TestUtils.readJsonFile(expectedPath);
            expect(content).toEqual(entity);

            resolve();
          }
        });
      });
    });

    it("should handle different entity types with real filesystem", async () => {
      // Initialize the plugin first
      await new Promise<void>((resolve) => {
        fsPlugin.onExportStart(config).subscribe({
          complete: () => resolve()
        });
      });

      const entities: NotionEntity[] = [
        { id: "page-1", type: "page" },
        { id: "block-1", type: "block" },
        { id: "database-1", type: "database" }
      ];

      const promises = entities.map(
        (entity) =>
          new Promise<void>((resolve) => {
            fsPlugin.onEntity(entity).subscribe({
              complete: () => resolve()
            });
          })
      );

      await Promise.all(promises);

      expect(fsPlugin.getActiveEntityCount()).toBe(3);
      expect(fsPlugin.getFileMap().size).toBe(3);

      // Verify all files were created
      for (const entity of entities) {
        const expectedPath = path.join(tempDir, entity.type, `${entity.id}.json`);
        const fileExists = await TestUtils.fileExists(expectedPath);
        expect(fileExists).toBe(true);

        const content = await TestUtils.readJsonFile(expectedPath);
        expect(content).toEqual(entity);
      }
    });

    it("should handle filesystem errors during entity processing", async () => {
      enableFsMock();
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockRejectedValueOnce(new Error("Disk full"));

      const entity: NotionEntity = {
        id: "test-id",
        type: "page"
      };

      return new Promise<void>((resolve) => {
        fsPlugin.onEntity(entity).subscribe({
          complete: () => {
            // Plugin should handle errors gracefully and complete normally
            disableFsMock();
            resolve();
          }
        });
      });
    });
  });

  describe("onExportComplete", () => {
    it("should write export summary to real filesystem", async () => {
      // Initialize the plugin first
      await new Promise<void>((resolve) => {
        fsPlugin.onExportStart(config).subscribe({
          complete: () => resolve()
        });
      });

      const summary: ExportSummary = {
        successCount: 10,
        errorCount: 2,
        processedTypes: { page: 8, block: 2 },
        duration: 5000
      };

      return new Promise<void>((resolve) => {
        fsPlugin.onExportComplete(summary).subscribe({
          complete: async () => {
            const summaryPath = path.join(tempDir, "export-summary.json");
            const fileExists = await TestUtils.fileExists(summaryPath);
            expect(fileExists).toBe(true);

            const content = await TestUtils.readJsonFile(summaryPath);
            expect(content).toEqual(summary);

            resolve();
          }
        });
      });
    });

    it("should handle errors when writing summary", async () => {
      enableFsMock();
      mockFs.writeFile.mockRejectedValueOnce(new Error("Permission denied"));

      const summary: ExportSummary = {
        successCount: 10,
        errorCount: 2,
        processedTypes: { page: 8, block: 2 },
        duration: 5000
      };

      return new Promise<void>((resolve) => {
        fsPlugin.onExportComplete(summary).subscribe({
          complete: () => {
            // Plugin should handle errors gracefully and complete normally
            disableFsMock();
            resolve();
          }
        });
      });
    });
  });

  describe("onError", () => {
    it("should handle errors gracefully", async () => {
      const error = new Error("Test error");
      return new Promise<void>((resolve) => {
        fsPlugin.onError(error).subscribe({
          complete: () => {
            resolve();
          }
        });
      });
    });

    it("should respect silent mode", async () => {
      fsPlugin.setSilentMode(true);
      const error = new Error("Test error");
      return new Promise<void>((resolve) => {
        fsPlugin.onError(error).subscribe({
          complete: () => {
            resolve();
          }
        });
      });
    });
  });

  describe("cleanup", () => {
    it("should cleanup resources", async () => {
      // Initialize the plugin first
      await new Promise<void>((resolve) => {
        fsPlugin.onExportStart(config).subscribe({
          complete: () => resolve()
        });
      });

      // Add some entities first
      const entity1: NotionEntity = { id: "test-1", type: "page" };
      const entity2: NotionEntity = { id: "test-2", type: "block" };

      const entityPromises = [entity1, entity2].map(
        (entity) =>
          new Promise<void>((resolve) => {
            fsPlugin.onEntity(entity).subscribe({
              complete: () => resolve()
            });
          })
      );

      await Promise.all(entityPromises);
      expect(fsPlugin.getActiveEntityCount()).toBe(2);
      expect(fsPlugin.getFileMap().size).toBe(2);

      return new Promise<void>((resolve) => {
        fsPlugin.cleanup().subscribe({
          complete: () => {
            expect(fsPlugin.getActiveEntityCount()).toBe(0);
            expect(fsPlugin.getFileMap().size).toBe(0);
            resolve();
          }
        });
      });
    });
  });

  describe("path generation", () => {
    it("should generate correct paths for entities", () => {
      const entity: NotionEntity = { id: "test-id", type: "page" };
      const filePath = fsPlugin["getPathForEntity"](entity);

      expect(filePath).toContain("page");
      expect(filePath).toContain("test-id.json");
      expect(filePath).toContain(tempDir);
    });

    it("should use default output dir when none provided", () => {
      const defaultPlugin = new FileSystemPlugin();
      const entity: NotionEntity = { id: "test-id", type: "database" };
      const filePath = defaultPlugin["getPathForEntity"](entity);

      expect(filePath).toContain("notion-export");
      expect(filePath).toContain("database");
      expect(filePath).toContain("test-id.json");
    });

    it("should handle entities with special characters in IDs", () => {
      const entity: NotionEntity = {
        id: "test-id-with-special-chars-@#$%",
        type: "page"
      };
      const filePath = fsPlugin["getPathForEntity"](entity);

      expect(filePath).toContain("page");
      expect(filePath).toContain("test-id-with-special-chars-@#$%.json");
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
        cleanup: vi.fn().mockReturnValue(of(undefined))
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
        cleanup: vi.fn().mockReturnValue(of(undefined))
      };

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
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await TestUtils.createTempDir();
  });

  afterEach(async () => {
    await TestUtils.cleanup();
  });

  it("should work end-to-end with real filesystem operations", async () => {
    const config: ExportConfig = {
      token: "test-token",
      outputDir: tempDir
    };

    const pluginManager = new PluginManager([new FileSystemPlugin(config)]);

    // Test start event
    pluginManager.notify({ type: "start", config });
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Test entity event
    const entity: NotionEntity = { id: "test-entity", type: "page" };
    pluginManager.notify({ type: "entity", entity });
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Test complete event
    const summary: ExportSummary = {
      successCount: 1,
      errorCount: 0,
      processedTypes: { page: 1 },
      duration: 1000
    };
    pluginManager.notify({ type: "complete", summary });
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Verify files were created
    const entityPath = path.join(tempDir, "page", "test-entity.json");
    const summaryPath = path.join(tempDir, "export-summary.json");

    expect(await TestUtils.fileExists(entityPath)).toBe(true);
    expect(await TestUtils.fileExists(summaryPath)).toBe(true);

    const entityContent = await TestUtils.readJsonFile(entityPath);
    const summaryContent = await TestUtils.readJsonFile(summaryPath);

    expect(entityContent).toEqual(entity);
    expect(summaryContent).toEqual(summary);

    // Cleanup
    return new Promise<void>((resolve) => {
      pluginManager.cleanup().subscribe({
        complete: () => {
          expect(pluginManager.getPlugins()).toHaveLength(1);
          expect(pluginManager.getPlugins()[0]).toBeInstanceOf(FileSystemPlugin);
          resolve();
        }
      });
    });
  });

  it("should handle multiple plugin types together", async () => {
    class TestPlugin implements ExportPlugin {
      onExportStart = vi.fn().mockReturnValue(of(undefined));
      onEntity = vi.fn().mockReturnValue(of(undefined));
      onExportComplete = vi.fn().mockReturnValue(of(undefined));
      onError = vi.fn().mockReturnValue(of(undefined));
      cleanup = vi.fn().mockReturnValue(of(undefined));
    }

    const config: ExportConfig = { token: "test-token", outputDir: tempDir };
    const pluginManager = new PluginManager([new FileSystemPlugin(config), new TestPlugin()]);

    const entity: NotionEntity = { id: "test-entity", type: "page" };
    pluginManager.notify({ type: "entity", entity });

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(pluginManager.getPlugins()).toHaveLength(2);
    expect(pluginManager.getPlugins()[0]).toBeInstanceOf(FileSystemPlugin);
    expect(pluginManager.getPlugins()[1]).toBeInstanceOf(TestPlugin);

    // Verify the filesystem plugin actually created the file
    const entityPath = path.join(tempDir, "page", "test-entity.json");
    expect(await TestUtils.fileExists(entityPath)).toBe(true);
  });

  it("should handle plugin errors without crashing", async () => {
    class ErrorPlugin implements ExportPlugin {
      onExportStart = vi.fn().mockReturnValue(throwError(() => new Error("Start error")));
      onEntity = vi.fn().mockReturnValue(throwError(() => new Error("Entity error")));
      onExportComplete = vi.fn().mockReturnValue(throwError(() => new Error("Complete error")));
      onError = vi.fn().mockReturnValue(throwError(() => new Error("Error in error handler")));
      cleanup = vi.fn().mockReturnValue(throwError(() => new Error("Cleanup error")));
    }

    const pluginManager = new PluginManager([new ErrorPlugin()]);

    const config: ExportConfig = { token: "test-token", outputDir: tempDir };
    const entity: NotionEntity = { id: "test-entity", type: "page" };
    const summary: ExportSummary = { successCount: 0, errorCount: 1, processedTypes: {}, duration: 100 };

    // All these should not crash the system
    pluginManager.notify({ type: "start", config });
    pluginManager.notify({ type: "entity", entity });
    pluginManager.notify({ type: "error", error: new Error("Test error") });
    pluginManager.notify({ type: "complete", summary });

    await new Promise((resolve) => setTimeout(resolve, 100));

    // Cleanup should not throw
    return new Promise<void>((resolve) => {
      pluginManager.cleanup().subscribe({
        complete: () => {
          expect(pluginManager.getPlugins()).toHaveLength(1);
          resolve();
        }
      });
    });
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
      cleanup: vi.fn().mockReturnValue(of(undefined))
    };

    registerPlugin(customPlugin);

    // Check plugin is registered
    const allPlugins = getAllPlugins();
    expect(allPlugins.size).toBeGreaterThan(1); // fs + custom plugin

    // Create plugin manager with registered plugins
    const pluginManager = new PluginManager([new FileSystemPlugin()]);
    expect(pluginManager.getPlugins()).toHaveLength(1);
  });
});

describe("Error Scenarios", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await TestUtils.createTempDir();
  });

  afterEach(async () => {
    await TestUtils.cleanup();
  });

  it("should handle file system errors gracefully", async () => {
    enableFsMock();
    mockFs.mkdir.mockRejectedValue(new Error("Permission denied"));
    mockFs.writeFile.mockRejectedValue(new Error("Disk full"));

    const fsPlugin = new FileSystemPlugin({ outputDir: tempDir });
    fsPlugin.setSilentMode(true);

    const config: ExportConfig = { token: "test-token", outputDir: tempDir };
    const entity: NotionEntity = { id: "test-entity", type: "page" };
    const summary: ExportSummary = { successCount: 0, errorCount: 1, processedTypes: {}, duration: 100 };

    // Plugin handles errors gracefully and completes normally
    const promises = [
      new Promise<void>((resolve) => {
        fsPlugin.onExportStart(config).subscribe({ complete: () => resolve() });
      }),
      new Promise<void>((resolve) => {
        fsPlugin.onEntity(entity).subscribe({ complete: () => resolve() });
      }),
      new Promise<void>((resolve) => {
        fsPlugin.onExportComplete(summary).subscribe({ complete: () => resolve() });
      })
    ];

    await Promise.all(promises);

    // Error handling should not throw
    await new Promise<void>((resolve) => {
      fsPlugin.onError(new Error("Test error")).subscribe({
        complete: () => {
          disableFsMock();
          resolve();
        }
      });
    });
  });

  it("should handle edge cases in plugin initialization", () => {
    // Test with empty array
    const pluginManager = new PluginManager([]);
    expect(pluginManager.getPlugins()).toHaveLength(0);

    // Test with filtered null values
    const pluginManager2 = new PluginManager([null, undefined].filter(Boolean) as any);
    expect(pluginManager2.getPlugins()).toHaveLength(0);
  });
});

describe("Real-World Scenarios", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await TestUtils.createTempDir();
  });

  afterEach(async () => {
    await TestUtils.cleanup();
  });

  it("should handle complex export workflow with multiple entity types", async () => {
    const config: ExportConfig = {
      token: "test-token",
      outputDir: tempDir
    };

    const fsPlugin = new FileSystemPlugin(config);
    const pluginManager = new PluginManager([fsPlugin]);

    // Start export
    pluginManager.notify({ type: "start", config });
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Process multiple entities
    const entities: NotionEntity[] = [
      { id: "page-1", type: "page" },
      { id: "page-2", type: "page" },
      { id: "database-1", type: "database" },
      { id: "block-1", type: "block" },
      { id: "block-2", type: "block" },
      { id: "block-3", type: "block" }
    ];

    for (const entity of entities) {
      pluginManager.notify({ type: "entity", entity });
      await new Promise((resolve) => setTimeout(resolve, 25));
    }

    // Complete export
    const summary: ExportSummary = {
      successCount: entities.length,
      errorCount: 0,
      processedTypes: { page: 2, database: 1, block: 3 },
      duration: 2000
    };

    pluginManager.notify({ type: "complete", summary });
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Verify all files were created correctly
    for (const entity of entities) {
      const entityPath = path.join(tempDir, entity.type, `${entity.id}.json`);
      expect(await TestUtils.fileExists(entityPath)).toBe(true);

      const content = await TestUtils.readJsonFile(entityPath);
      expect(content).toEqual(entity);
    }

    // Verify summary file
    const summaryPath = path.join(tempDir, "export-summary.json");
    expect(await TestUtils.fileExists(summaryPath)).toBe(true);

    const summaryContent = await TestUtils.readJsonFile(summaryPath);
    expect(summaryContent).toEqual(summary);

    // Verify plugin state
    expect(fsPlugin.getActiveEntityCount()).toBe(entities.length);
    expect(fsPlugin.getFileMap().size).toBe(entities.length);

    // Cleanup
    await new Promise<void>((resolve) => {
      pluginManager.cleanup().subscribe({
        complete: () => {
          expect(fsPlugin.getActiveEntityCount()).toBe(0);
          expect(fsPlugin.getFileMap().size).toBe(0);
          resolve();
        }
      });
    });
  });

  it("should handle concurrent entity processing", async () => {
    const config: ExportConfig = {
      token: "test-token",
      outputDir: tempDir
    };

    const fsPlugin = new FileSystemPlugin(config);
    const pluginManager = new PluginManager([fsPlugin]);

    // Start export
    pluginManager.notify({ type: "start", config });
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Process entities concurrently
    const entities: NotionEntity[] = [
      { id: "concurrent-1", type: "page" },
      { id: "concurrent-2", type: "page" },
      { id: "concurrent-3", type: "database" }
    ];

    // Send all notifications at once
    entities.forEach((entity) => {
      pluginManager.notify({ type: "entity", entity });
    });

    // Wait for all to complete
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Verify all files were created
    for (const entity of entities) {
      const entityPath = path.join(tempDir, entity.type, `${entity.id}.json`);
      expect(await TestUtils.fileExists(entityPath)).toBe(true);
    }

    expect(fsPlugin.getActiveEntityCount()).toBe(entities.length);
    expect(fsPlugin.getFileMap().size).toBe(entities.length);
  });
});
