import type { Command } from "@oclif/core";
import * as fs from "fs/promises";
import * as path from "path";
import { from, Observable, of, Subject } from "rxjs";
import { catchError, map, tap } from "rxjs/operators";
import type { ExporterConfig, ExportEventPayload, ExportSummary, NotionEntity } from "../types";
import { log } from "../utils/logging";

/**
 * Export plugin interface that all plugins must implement.
 *
 * Plugins can handle different stages of the export process.
 */
export interface ExportPlugin {
  /**
   * Called when export starts.
   *
   * @param config - Export configuration
   * @returns Observable that completes when initialization is done
   */
  onExportStart(config: ExporterConfig): Observable<void>;

  /**
   * Called for each entity being exported.
   *
   * @param entity - The Notion entity being processed
   * @returns Observable that completes when entity is processed
   */
  onEntity(entity: NotionEntity): Observable<void>;

  /**
   * Called when export completes.
   *
   * @param summary - Export summary with statistics
   * @returns Observable that completes when finalization is done
   */
  onExportComplete(summary: ExportSummary): Observable<void>;

  /**
   * Called when an error occurs.
   *
   * @param error - The error that occurred
   * @returns Observable that completes when error is handled
   */
  onError(error: Error): Observable<void>;

  /**
   * Cleanup any resources used by the plugin.
   *
   * @returns Promise that resolves when cleanup is complete
   */
  cleanup(): Promise<void>;
}

/**
 * Plugin manager that coordinates plugin execution.
 *
 * Manages plugin lifecycle and event routing.
 */
export class ExportPluginManager {
  private plugins: ExportPlugin[] = [];
  private eventStream$ = new Subject<ExportEventPayload>();
  private silent = false;

  constructor(pluginInstances: ExportPlugin[] = []) {
    // Enable silent mode during testing
    this.silent = process.env.NODE_ENV === "test" || process.env.VITEST === "true";
    this.plugins = pluginInstances;
    this.setupEventRouting();
  }

  /**
   * Setup event routing to plugins.
   */
  private setupEventRouting(): void {
    this.eventStream$.subscribe({
      next: (payload) => {
        // Handle events asynchronously without blocking
        this.handleEventAsync(payload).catch((error) => {
          if (!this.silent) {
            log.error("ExportPluginManager:eventHandling", error);
          }
        });
      },
      error: (error) => {
        if (!this.silent) {
          log.error("ExportPluginManager:eventStream", error);
        }
      }
    });
  }

  /**
   * Handle events asynchronously.
   */
  private async handleEventAsync(payload: ExportEventPayload): Promise<void> {
    switch (payload.type) {
      case "start":
        await this.handleStart(payload.config);
        break;
      case "entity":
        await this.handleEntity(payload.entity);
        break;
      case "error":
        await this.handleError(payload.error);
        break;
      case "complete":
        await this.handleComplete(payload.summary);
        break;
      default:
        // Ignore unknown event types
        break;
    }
  }

  /**
   * Handle export start event.
   */
  private async handleStart(config: ExporterConfig): Promise<void> {
    const promises = this.plugins.map((plugin) =>
      plugin
        .onExportStart(config)
        .toPromise()
        .catch((error) => {
          if (!this.silent) {
            log.error("ExportPluginManager:handleStart", error);
          }
        })
    );
    await Promise.allSettled(promises);
  }

  /**
   * Handle entity event.
   */
  private async handleEntity(entity: NotionEntity): Promise<void> {
    const promises = this.plugins.map((plugin) =>
      plugin
        .onEntity(entity)
        .toPromise()
        .catch((error) => {
          if (!this.silent) {
            log.error("ExportPluginManager:handleEntity", error);
          }
        })
    );
    await Promise.allSettled(promises);
  }

  /**
   * Handle error event.
   */
  private async handleError(error: Error): Promise<void> {
    const promises = this.plugins.map((plugin) =>
      plugin
        .onError(error)
        .toPromise()
        .catch((err) => {
          if (!this.silent) {
            log.error("ExportPluginManager:handleError", err);
          }
        })
    );
    await Promise.allSettled(promises);
  }

  /**
   * Handle export complete event.
   */
  private async handleComplete(summary: ExportSummary): Promise<void> {
    const promises = this.plugins.map((plugin) =>
      plugin
        .onExportComplete(summary)
        .toPromise()
        .catch((error) => {
          if (!this.silent) {
            log.error("ExportPluginManager:handleComplete", error);
          }
        })
    );
    await Promise.allSettled(promises);
  }

  /**
   * Notify plugins of an event.
   *
   * @param payload - Export event payload
   */
  notify(payload: ExportEventPayload): void {
    this.eventStream$.next(payload);
  }

  /**
   * Cleanup all plugins.
   *
   * @returns Promise that resolves when all plugins are cleaned up
   */
  async cleanup(): Promise<void> {
    const promises = this.plugins.map((plugin) =>
      plugin.cleanup().catch((error) => {
        if (!this.silent) {
          log.error("ExportPluginManager:cleanup", error);
        }
      })
    );
    await Promise.allSettled(promises);
  }

  /**
   * Set silent mode for testing.
   *
   * @param silent - Whether to suppress error logging
   */
  setSilentMode(silent: boolean): void {
    this.silent = silent;
  }

  /**
   * Get plugins for testing.
   */
  getPlugins(): ExportPlugin[] {
    return this.plugins;
  }
}

/**
 * Filesystem plugin for exporting entities to files.
 *
 * Writes entities to the filesystem in JSON format.
 */
export class FileSystemPlugin implements ExportPlugin {
  private fileMap: Map<string, string> = new Map();
  private activeEntityCount = 0;
  private silent = false;

  constructor(private config: Partial<ExporterConfig> = {}) {
    // Enable silent mode during testing
    this.silent = process.env.NODE_ENV === "test" || process.env.VITEST === "true";
  }

  onExportStart(config: ExporterConfig): Observable<void> {
    const outputDir = config.outputDir || "./notion-export";
    return from(fs.mkdir(outputDir, { recursive: true })).pipe(
      tap(() => {
        if (!this.silent) {
          log.info(`FileSystemPlugin initialized with output directory: ${outputDir}`);
        }
      }),
      catchError((error) => {
        if (!this.silent) {
          log.error("FileSystemPlugin:onExportStart", error);
        }
        throw error;
      }),
      map((): void => undefined)
    );
  }

  onEntity(entity: NotionEntity): Observable<void> {
    const entityPath = this.getPathForEntity(entity);
    const entityDir = path.dirname(entityPath);

    this.activeEntityCount++;

    return from(
      fs
        .mkdir(entityDir, { recursive: true })
        .then(() => fs.writeFile(entityPath, JSON.stringify(entity, null, 2)))
        .then(() => {
          this.fileMap.set(entity.id, entityPath);
        })
    ).pipe(
      catchError((error) => {
        if (!this.silent) {
          log.error("FileSystemPlugin:onEntity", error);
        }
        throw error;
      }),
      map((): void => undefined)
    );
  }

  onExportComplete(summary: ExportSummary): Observable<void> {
    const summaryPath = path.join(this.config.outputDir || "./notion-export", "export-summary.json");
    return from(fs.writeFile(summaryPath, JSON.stringify(summary, null, 2))).pipe(
      tap(() => {
        if (!this.silent) {
          log.success(`Export completed. Summary written to: ${summaryPath}`);
        }
      }),
      catchError((error) => {
        if (!this.silent) {
          log.error("FileSystemPlugin:onExportComplete", error);
        }
        throw error;
      }),
      map((): void => undefined)
    );
  }

  onError(error: Error): Observable<void> {
    return of(undefined as void).pipe(
      tap(() => {
        if (!this.silent) {
          log.error("FileSystemPlugin:onError", error);
        }
      })
    );
  }

  cleanup(): Promise<void> {
    // Close any pending file handles
    this.fileMap.clear();
    this.activeEntityCount = 0;
    return Promise.resolve();
  }

  /**
   * Get filesystem path for an entity.
   */
  private getPathForEntity(entity: NotionEntity): string {
    const baseDir = this.config.outputDir || "./notion-export";
    const typeDir = path.join(baseDir, entity.type);
    return path.join(typeDir, `${entity.id}.json`);
  }

  /**
   * Get the number of active entities being processed.
   */
  getActiveEntityCount(): number {
    return this.activeEntityCount;
  }

  /**
   * Get the file map for testing purposes.
   */
  getFileMap(): Map<string, string> {
    return this.fileMap;
  }

  /**
   * Set silent mode for testing.
   *
   * @param silent - Whether to suppress error logging
   */
  setSilentMode(silent: boolean): void {
    this.silent = silent;
  }
}

/**
 * Global plugin registry for managing available plugins.
 */
class PluginRegistry {
  private plugins: Map<string, new () => ExportPlugin> = new Map();
  private commands: Command[] = [];

  /**
   * Register a plugin class.
   */
  register(name: string, plugin: new () => ExportPlugin): void {
    this.plugins.set(name, plugin);
  }

  /**
   * Get a plugin class by name.
   */
  get(name: string): new () => ExportPlugin | undefined {
    return this.plugins.get(name);
  }

  /**
   * Get all registered plugins.
   */
  getAll(): Map<string, new () => ExportPlugin> {
    return new Map(this.plugins);
  }

  /**
   * Remove a plugin from registry.
   */
  unregister(name: string): boolean {
    return this.plugins.delete(name);
  }

  /**
   * Clear all plugins.
   */
  clear(): void {
    this.plugins.clear();
  }

  /**
   * Set commands for plugin system.
   */
  setCommands(commands: Command[]): void {
    this.commands = commands;
  }

  /**
   * Get commands.
   */
  getCommands(): Command[] {
    return this.commands;
  }
}

// Global plugin registry instance
const globalRegistry = new PluginRegistry();

/**
 * Initialize the plugin system.
 *
 * @param commands - CLI commands to enhance with plugin support
 */
export function initPluginSystem(commands: Command[]): void {
  globalRegistry.setCommands(commands);

  // Register default plugins
  globalRegistry.register("fs", FileSystemPlugin);

  // Setup plugin discovery - could be extended to scan directories
  // or load from npm packages in the future
  const silent = process.env.NODE_ENV === "test" || process.env.VITEST === "true";
  if (!silent) {
    log.info(`Plugin system initialized with ${globalRegistry.getAll().size} plugins`);
  }
}

/**
 * Register a plugin globally.
 *
 * @param plugin - Plugin instance to register
 */
export function registerPlugin(plugin: ExportPlugin): void {
  // Get the plugin class name or generate a unique name
  const pluginName = plugin.constructor.name || `plugin_${Date.now()}`;

  // Convert instance to class for registration
  const PluginClass = plugin.constructor as new () => ExportPlugin;
  globalRegistry.register(pluginName, PluginClass);

  const silent = process.env.NODE_ENV === "test" || process.env.VITEST === "true";
  if (!silent) {
    log.success(`Plugin '${pluginName}' registered globally`);
  }
}

/**
 * Get a plugin from the global registry.
 *
 * @param name - Plugin name
 * @returns Plugin class or undefined
 */
export function getPlugin(name: string): new () => ExportPlugin | undefined {
  return globalRegistry.get(name);
}

/**
 * Get all registered plugins.
 *
 * @returns Map of plugin names to classes
 */
export function getAllPlugins(): Map<string, new () => ExportPlugin> {
  return globalRegistry.getAll();
}

/**
 * Unregister a plugin from the global registry.
 *
 * @param name - Plugin name to remove
 * @returns True if plugin was removed, false if not found
 */
export function unregisterPlugin(name: string): boolean {
  return globalRegistry.unregister(name);
}

/**
 * Clear all plugins from the global registry.
 */
export function clearPlugins(): void {
  globalRegistry.clear();
}

/**
 * Default plugins that are always loaded.
 */
export const defaultPlugins: Array<new () => ExportPlugin> = [FileSystemPlugin];
