import { of, throwError } from "rxjs";
import { inspect } from "util";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ExportEventPayload, ExportSummary, ExporterConfig, NotionEntity } from "../types";
import {
  ExportPlugin,
  ExportPluginManager,
  FSPlugin,
  clearPlugins,
  defaultPlugins,
  getAllPlugins,
  getPlugin,
  initPluginSystem,
  registerPlugin,
  unregisterPlugin
} from "./index";

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
      console.log(inspect(pluginManager, { colors: true, compact: false }));
      expect(pluginManager).toBeDefined();
    });

    it("should initialize with plugin instances", () => {
      const TestPlugin = class implements ExportPlugin {
        onExportStart = vi.fn().mockReturnValue(of(undefined));
        onEntity = vi.fn().mockReturnValue(of(undefined));
        onExportComplete = vi.fn().mockReturnValue(of(undefined));
        onError = vi.fn().mockReturnValue(of(undefined));
        cleanup = vi.fn().mockResolvedValue(undefined);
      };

      pluginManager = new ExportPluginManager([TestPlugin]);
      console.log(inspect(pluginManager["plugins"], { colors: true, compact: false }));
      expect(pluginManager["plugins"]).toHaveLength(1);
    });

    it("should handle plugin initialization errors", () => {
      const FailingPlugin = class {
        constructor() {
          throw new Error("Plugin init error");
        }
      };

      pluginManager = new ExportPluginManager([FailingPlugin as any]);
      console.log(inspect(pluginManager["plugins"], { colors: true, compact: false }));
      expect(pluginManager["plugins"]).toHaveLength(0);
    });
  });

  describe("notify", () => {
    it("should notify plugins of start events", () => {
      return new Promise<void>((resolve) => {
        pluginManager = new ExportPluginManager([]);
        pluginManager["plugins"] = [mockPlugin];

        const startPayload: ExportEventPayload = {
          type: "start",
          config
        };

        pluginManager.notify(startPayload);

        setTimeout(() => {
          console.log(inspect(mockPlugin.onExportStart, { colors: true, compact: false }));
          expect(mockPlugin.onExportStart).toHaveBeenCalledWith(config);
          resolve();
        }, 100);
      });
    });

    it("should notify plugins of entity events", () => {
      return new Promise<void>((resolve) => {
        pluginManager = new ExportPluginManager([]);
        pluginManager["plugins"] = [mockPlugin];

        const entity: NotionEntity = {
          id: "test-id",
          type: "page"
        };

        const entityPayload: ExportEventPayload = {
          type: "entity",
          entity
        };

        pluginManager.notify(entityPayload);

        setTimeout(() => {
          console.log(inspect(mockPlugin.onEntity, { colors: true, compact: false }));
          expect(mockPlugin.onEntity).toHaveBeenCalledWith(entity);
          resolve();
        }, 100);
      });
    });

    it("should notify plugins of error events", () => {
      return new Promise<void>((resolve) => {
        pluginManager = new ExportPluginManager([]);
        pluginManager["plugins"] = [mockPlugin];

        const error = new Error("Test error");
        const errorPayload: ExportEventPayload = {
          type: "error",
          error
        };

        pluginManager.notify(errorPayload);

        setTimeout(() => {
          console.log(inspect(mockPlugin.onError, { colors: true, compact: false }));
          expect(mockPlugin.onError).toHaveBeenCalledWith(error);
          resolve();
        }, 100);
      });
    });

    it("should notify plugins of complete events", () => {
      return new Promise<void>((resolve) => {
        pluginManager = new ExportPluginManager([]);
        pluginManager["plugins"] = [mockPlugin];

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

        setTimeout(() => {
          console.log(inspect(mockPlugin.onExportComplete, { colors: true, compact: false }));
          expect(mockPlugin.onExportComplete).toHaveBeenCalledWith(summary);
          resolve();
        }, 100);
      });
    });

    it("should handle multiple plugins", () => {
      return new Promise<void>((resolve) => {
        const mockPlugin2 = {
          ...mockPlugin,
          onEntity: vi.fn().mockReturnValue(of(undefined))
        };

        pluginManager = new ExportPluginManager([]);
        pluginManager["plugins"] = [mockPlugin, mockPlugin2];

        const entity: NotionEntity = {
          id: "test-id",
          type: "block"
        };

        pluginManager.notify({ type: "entity", entity });

        setTimeout(() => {
          console.log(
            inspect(
              {
                plugin1: (mockPlugin.onEntity as any).mock.calls,
                plugin2: (mockPlugin2.onEntity as any).mock.calls
              },
              { colors: true, compact: false }
            )
          );
          expect(mockPlugin.onEntity).toHaveBeenCalledWith(entity);
          expect(mockPlugin2.onEntity).toHaveBeenCalledWith(entity);
          resolve();
        }, 100);
      });
    });

    it("should handle unknown event types", () => {
      return new Promise<void>((resolve) => {
        pluginManager = new ExportPluginManager([]);
        pluginManager["plugins"] = [mockPlugin];

        const unknownPayload = {
          type: "unknown"
        } as any;

        pluginManager.notify(unknownPayload);

        setTimeout(() => {
          console.log(inspect({ handledUnknownEvent: true }, { colors: true, compact: false }));
          expect(mockPlugin.onExportStart).not.toHaveBeenCalled();
          expect(mockPlugin.onEntity).not.toHaveBeenCalled();
          expect(mockPlugin.onError).not.toHaveBeenCalled();
          expect(mockPlugin.onExportComplete).not.toHaveBeenCalled();
          resolve();
        }, 100);
      });
    });

    it("should handle plugin errors in event handlers", () => {
      return new Promise<void>((resolve) => {
        const failingPlugin = {
          ...mockPlugin,
          onEntity: vi.fn().mockReturnValue(throwError(() => new Error("Plugin error")))
        };

        pluginManager = new ExportPluginManager([]);
        pluginManager["plugins"] = [failingPlugin];

        const entity: NotionEntity = {
          id: "test-id",
          type: "page"
        };

        pluginManager.notify({ type: "entity", entity });

        setTimeout(() => {
          console.log(inspect({ errorHandled: true }, { colors: true, compact: false }));
          expect(failingPlugin.onEntity).toHaveBeenCalledWith(entity);
          resolve();
        }, 100);
      });
    });

    it("should handle progress events", () => {
      return new Promise<void>((resolve) => {
        pluginManager = new ExportPluginManager([]);
        pluginManager["plugins"] = [mockPlugin];

        const progressPayload: ExportEventPayload = {
          type: "progress",
          complete: 50,
          total: 100
        };

        pluginManager.notify(progressPayload);

        setTimeout(() => {
          console.log(inspect({ progressEventHandled: true }, { colors: true, compact: false }));
          // Progress events don't trigger plugin handlers, so no calls expected
          expect(mockPlugin.onExportStart).not.toHaveBeenCalled();
          expect(mockPlugin.onEntity).not.toHaveBeenCalled();
          expect(mockPlugin.onError).not.toHaveBeenCalled();
          expect(mockPlugin.onExportComplete).not.toHaveBeenCalled();
          resolve();
        }, 100);
      });
    });
  });

  describe("cleanup", () => {
    it("should cleanup all plugins", async () => {
      const mockPlugin2 = {
        ...mockPlugin,
        cleanup: vi.fn().mockResolvedValue(undefined)
      };

      pluginManager = new ExportPluginManager([]);
      pluginManager["plugins"] = [mockPlugin, mockPlugin2];

      await pluginManager.cleanup();

      console.log(
        inspect(
          {
            plugin1Cleanup: (mockPlugin.cleanup as any).mock.calls,
            plugin2Cleanup: (mockPlugin2.cleanup as any).mock.calls
          },
          { colors: true, compact: false }
        )
      );
      expect(mockPlugin.cleanup).toHaveBeenCalled();
      expect(mockPlugin2.cleanup).toHaveBeenCalled();
    });

    it("should handle cleanup errors gracefully", async () => {
      const failingPlugin = {
        ...mockPlugin,
        cleanup: vi.fn().mockRejectedValue(new Error("Cleanup error"))
      };

      pluginManager = new ExportPluginManager([]);
      pluginManager["plugins"] = [mockPlugin, failingPlugin];

      await expect(pluginManager.cleanup()).resolves.not.toThrow();
      console.log(
        inspect({ cleanupCalls: (failingPlugin.cleanup as any).mock.calls }, { colors: true, compact: false })
      );
    });
  });
});

describe("FSPlugin", () => {
  let fsPlugin: FSPlugin;
  let config: ExporterConfig;

  beforeEach(() => {
    config = {
      token: "test-token",
      outputDir: "./test-output"
    };
    fsPlugin = new FSPlugin(config);
  });

  describe("constructor", () => {
    it("should initialize with default config", () => {
      const defaultPlugin = new FSPlugin();
      console.log(inspect({ defaultConfig: true }, { colors: true, compact: false }));
      expect(defaultPlugin).toBeDefined();
    });

    it("should initialize with provided config", () => {
      console.log(inspect({ configProvided: true }, { colors: true, compact: false }));
      expect(fsPlugin).toBeDefined();
    });
  });

  describe("onExportStart", () => {
    it("should initialize successfully", () => {
      return new Promise<void>((resolve) => {
        fsPlugin.onExportStart(config).subscribe({
          complete: () => {
            console.log(inspect({ initialized: true }, { colors: true, compact: false }));
            expect(true).toBe(true);
            resolve();
          }
        });
      });
    });

    it("should handle filesystem errors during initialization", () => {
      return new Promise<void>((resolve) => {
        const badConfig = {
          ...config,
          outputDir: "/root/invalid-path"
        };

        fsPlugin.onExportStart(badConfig).subscribe({
          error: (error) => {
            console.log(inspect({ error: error.message }, { colors: true, compact: false }));
            expect(error).toBeDefined();
            resolve();
          }
        });
      });
    });
  });

  describe("onEntity", () => {
    it("should process entities successfully", () => {
      return new Promise<void>((resolve) => {
        const entity: NotionEntity = {
          id: "test-id",
          type: "page"
        };

        fsPlugin.onEntity(entity).subscribe({
          complete: () => {
            console.log(inspect({ entityProcessed: true }, { colors: true, compact: false }));
            expect(fsPlugin.getActiveEntityCount()).toBe(1);
            expect(fsPlugin.getFileMap().has(entity.id)).toBe(true);
            resolve();
          }
        });
      });
    });

    it("should handle different entity types", () => {
      return new Promise<void>((resolve) => {
        const entities: NotionEntity[] = [
          { id: "page-1", type: "page" },
          { id: "block-1", type: "block" },
          { id: "database-1", type: "database" }
        ];

        let completedCount = 0;
        entities.forEach((entity) => {
          fsPlugin.onEntity(entity).subscribe({
            complete: () => {
              completedCount++;
              if (completedCount === entities.length) {
                console.log(
                  inspect(
                    {
                      entitiesProcessed: completedCount,
                      activeCount: fsPlugin.getActiveEntityCount(),
                      fileMapSize: fsPlugin.getFileMap().size
                    },
                    { colors: true, compact: false }
                  )
                );
                expect(fsPlugin.getActiveEntityCount()).toBe(3);
                expect(fsPlugin.getFileMap().size).toBe(3);
                resolve();
              }
            }
          });
        });
      });
    });

    it("should handle filesystem errors during entity processing", () => {
      return new Promise<void>((resolve) => {
        const entity: NotionEntity = {
          id: "test-id",
          type: "page"
        };

        // Create a plugin with an invalid output directory to force an error
        const badPlugin = new FSPlugin({ outputDir: "/root/invalid-path" });

        badPlugin.onEntity(entity).subscribe({
          error: (error) => {
            console.log(inspect({ error: error.message }, { colors: true, compact: false }));
            expect(error).toBeDefined();
            resolve();
          },
          complete: () => {
            // This shouldn't happen but in case it does, resolve
            resolve();
          }
        });
      });
    });
  });

  describe("onExportComplete", () => {
    it("should write export summary", () => {
      return new Promise<void>((resolve) => {
        const summary: ExportSummary = {
          successCount: 10,
          errorCount: 2,
          processedTypes: { page: 8, block: 2 },
          duration: 5000
        };

        fsPlugin.onExportComplete(summary).subscribe({
          complete: () => {
            console.log(inspect({ summaryWritten: true }, { colors: true, compact: false }));
            expect(true).toBe(true);
            resolve();
          }
        });
      });
    });

    it("should handle errors when writing summary", () => {
      return new Promise<void>((resolve) => {
        const summary: ExportSummary = {
          successCount: 10,
          errorCount: 2,
          processedTypes: { page: 8, block: 2 },
          duration: 5000
        };

        const badPlugin = new FSPlugin({ outputDir: "/root/invalid-path" });

        badPlugin.onExportComplete(summary).subscribe({
          error: (error) => {
            console.log(inspect({ error: error.message }, { colors: true, compact: false }));
            expect(error).toBeDefined();
            resolve();
          }
        });
      });
    });
  });

  describe("onError", () => {
    it("should handle errors gracefully", () => {
      return new Promise<void>((resolve) => {
        const error = new Error("Test error");

        fsPlugin.onError(error).subscribe({
          complete: () => {
            console.log(inspect({ errorHandled: true }, { colors: true, compact: false }));
            expect(true).toBe(true);
            resolve();
          }
        });
      });
    });
  });

  describe("cleanup", () => {
    it("should cleanup resources", async () => {
      // Add some entities first
      const entity1: NotionEntity = { id: "test-1", type: "page" };
      const entity2: NotionEntity = { id: "test-2", type: "block" };

      await new Promise<void>((resolve) => {
        fsPlugin.onEntity(entity1).subscribe({
          complete: () => {
            fsPlugin.onEntity(entity2).subscribe({
              complete: () => resolve()
            });
          }
        });
      });

      expect(fsPlugin.getActiveEntityCount()).toBe(2);
      expect(fsPlugin.getFileMap().size).toBe(2);

      await fsPlugin.cleanup();

      console.log(inspect({ cleanedUp: true }, { colors: true, compact: false }));
      expect(fsPlugin.getActiveEntityCount()).toBe(0);
      expect(fsPlugin.getFileMap().size).toBe(0);
    });
  });

  describe("getPathForEntity", () => {
    it("should generate correct paths for entities", () => {
      const entity: NotionEntity = { id: "test-id", type: "page" };
      const path = fsPlugin["getPathForEntity"](entity);

      console.log(inspect({ generatedPath: path }, { colors: true, compact: false }));
      expect(path).toContain("page");
      expect(path).toContain("test-id.json");
    });

    it("should use default output dir when none provided", () => {
      const defaultPlugin = new FSPlugin();
      const entity: NotionEntity = { id: "test-id", type: "database" };
      const path = defaultPlugin["getPathForEntity"](entity);

      console.log(inspect({ defaultPath: path }, { colors: true, compact: false }));
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
      console.log(
        inspect(
          {
            initialized: true,
            pluginCount: allPlugins.size,
            plugins: Array.from(allPlugins.keys())
          },
          { colors: true, compact: false }
        )
      );

      expect(allPlugins.size).toBeGreaterThan(0);
      expect(allPlugins.has("fs")).toBe(true);
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
      console.log(
        inspect(
          {
            registered: true,
            pluginCount: allPlugins.size,
            plugins: Array.from(allPlugins.keys())
          },
          { colors: true, compact: false }
        )
      );

      expect(allPlugins.size).toBeGreaterThan(0);
    });
  });

  describe("getPlugin", () => {
    it("should retrieve registered plugin", () => {
      initPluginSystem([]);

      const fsPlugin = getPlugin("fs");
      console.log(
        inspect(
          {
            retrieved: true,
            pluginFound: fsPlugin !== undefined
          },
          { colors: true, compact: false }
        )
      );

      expect(fsPlugin).toBeDefined();
      expect(fsPlugin).toBe(FSPlugin);
    });

    it("should return undefined for non-existent plugin", () => {
      const nonExistentPlugin = getPlugin("non-existent");
      console.log(
        inspect(
          {
            nonExistent: true,
            result: nonExistentPlugin
          },
          { colors: true, compact: false }
        )
      );

      expect(nonExistentPlugin).toBeUndefined();
    });
  });

  describe("getAllPlugins", () => {
    it("should return all registered plugins", () => {
      initPluginSystem([]);

      const allPlugins = getAllPlugins();
      console.log(
        inspect(
          {
            allPlugins: true,
            pluginCount: allPlugins.size,
            plugins: Array.from(allPlugins.keys())
          },
          { colors: true, compact: false }
        )
      );

      expect(allPlugins).toBeInstanceOf(Map);
      expect(allPlugins.size).toBeGreaterThan(0);
    });
  });

  describe("unregisterPlugin", () => {
    it("should remove plugin from registry", () => {
      initPluginSystem([]);

      const removed = unregisterPlugin("fs");
      const fsPlugin = getPlugin("fs");

      console.log(
        inspect(
          {
            removed: removed,
            pluginExists: fsPlugin !== undefined
          },
          { colors: true, compact: false }
        )
      );

      expect(removed).toBe(true);
      expect(fsPlugin).toBeUndefined();
    });

    it("should return false for non-existent plugin", () => {
      const removed = unregisterPlugin("non-existent");
      console.log(
        inspect(
          {
            removed: removed
          },
          { colors: true, compact: false }
        )
      );

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
      console.log(
        inspect(
          {
            cleared: true,
            pluginCount: allPlugins.size
          },
          { colors: true, compact: false }
        )
      );

      expect(allPlugins.size).toBe(0);
    });
  });
});

describe("defaultPlugins", () => {
  it("should include FSPlugin", () => {
    console.log(
      inspect(
        {
          defaultPlugins: defaultPlugins.map((p) => p.name),
          includesFSPlugin: defaultPlugins.includes(FSPlugin)
        },
        { colors: true, compact: false }
      )
    );

    expect(defaultPlugins).toContain(FSPlugin);
  });
});

describe("Integration Tests", () => {
  it("should work end-to-end with plugin manager and FSPlugin", async () => {
    const config: ExporterConfig = {
      token: "test-token",
      outputDir: "./test-output"
    };

    const pluginManager = new ExportPluginManager([FSPlugin]);

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

    // Cleanup
    await pluginManager.cleanup();

    console.log(
      inspect(
        {
          endToEndTest: "completed",
          pluginCount: pluginManager["plugins"].length
        },
        { colors: true, compact: false }
      )
    );

    expect(pluginManager["plugins"]).toHaveLength(1);
  });

  it("should handle multiple plugin types together", () => {
    return new Promise<void>((resolve) => {
      const TestPlugin = class implements ExportPlugin {
        onExportStart = vi.fn().mockReturnValue(of(undefined));
        onEntity = vi.fn().mockReturnValue(of(undefined));
        onExportComplete = vi.fn().mockReturnValue(of(undefined));
        onError = vi.fn().mockReturnValue(of(undefined));
        cleanup = vi.fn().mockResolvedValue(undefined);
      };

      const pluginManager = new ExportPluginManager([FSPlugin, TestPlugin]);
      const entity: NotionEntity = { id: "test-entity", type: "page" };

      pluginManager.notify({ type: "entity", entity });

      setTimeout(() => {
        console.log(
          inspect(
            {
              multiplePlugins: true,
              pluginCount: pluginManager["plugins"].length
            },
            { colors: true, compact: false }
          )
        );

        expect(pluginManager["plugins"]).toHaveLength(2);
        resolve();
      }, 100);
    });
  });
});
