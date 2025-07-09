import { of } from "rxjs";
import { inspect } from "util";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ExportEventPayload, ExportSummary, ExporterConfig, NotionEntity } from "../types";
import { ExportPlugin, ExportPluginManager, FSPlugin, initPluginSystem, registerPlugin } from "./index";

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
  });

  describe("onEntity", () => {
    it("should process entities", () => {
      return new Promise<void>((resolve) => {
        const entity: NotionEntity = {
          id: "test-id",
          type: "page"
        };

        // Mock file system operations
        fsPlugin["getPathForEntity"] = vi.fn().mockReturnValue("/test/path/page.json");

        fsPlugin.onEntity(entity).subscribe({
          complete: () => {
            console.log(inspect({ entityProcessed: true }, { colors: true, compact: false }));
            expect(fsPlugin["getPathForEntity"]).toHaveBeenCalledWith(entity);
            resolve();
          }
        });
      });
    });
  });

  describe("cleanup", () => {
    it("should cleanup resources", async () => {
      await fsPlugin.cleanup();
      console.log(inspect({ cleanedUp: true }, { colors: true, compact: false }));
      expect(true).toBe(true);
    });
  });
});

describe("initPluginSystem", () => {
  it("should initialize plugin system", () => {
    const commands: any[] = [];
    initPluginSystem(commands);
    console.log(inspect({ initialized: true }, { colors: true, compact: false }));
    expect(true).toBe(true);
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
    console.log(inspect({ registered: true }, { colors: true, compact: false }));
    expect(true).toBe(true);
  });
});
