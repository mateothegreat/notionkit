import type { Command } from "@oclif/core";
import * as fs from "fs/promises";
import * as path from "path";
import { from, merge, Observable, of, Subject } from "rxjs";
import { catchError, map, mergeMap, toArray } from "rxjs/operators";
import type { ExporterConfig, ExportEventPayload, ExportSummary, NotionEntity } from "../types";

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

  constructor(private pluginClasses: Array<new () => ExportPlugin>) {
    // Enable silent mode during testing
    this.silent = process.env.NODE_ENV === "test" || process.env.VITEST === "true";
    this.initializePlugins();
    this.setupEventRouting();
  }

  /**
   * Initialize plugin instances from classes.
   */
  private initializePlugins(): void {
    this.pluginClasses.forEach((PluginClass) => {
      try {
        const plugin = new PluginClass();
        this.plugins.push(plugin);
      } catch (error) {
        if (!this.silent) {
          console.error(`Failed to initialize plugin ${PluginClass.name}`, error);
        }
      }
    });
  }

  /**
   * Setup event routing to plugins.
   */
  private setupEventRouting(): void {
    this.eventStream$
      .pipe(
        mergeMap((payload) => {
          switch (payload.type) {
            case "start":
              return this.handleStart(payload.config);
            case "entity":
              return this.handleEntity(payload.entity);
            case "error":
              return this.handleError(payload.error);
            case "complete":
              return this.handleComplete(payload.summary);
            default:
              return of(undefined);
          }
        })
      )
      .subscribe();
  }

  /**
   * Handle export start event.
   */
  private handleStart(config: ExporterConfig): Observable<void> {
    return merge(
      ...this.plugins.map((plugin) =>
        from(plugin.onExportStart(config)).pipe(
          catchError((error) => {
            if (!this.silent) {
              console.error("Plugin error in onExportStart:", error);
            }
            return of(undefined);
          })
        )
      )
    ).pipe(
      toArray(),
      map((): void => undefined)
    );
  }

  /**
   * Handle entity event.
   */
  private handleEntity(entity: NotionEntity): Observable<void> {
    return merge(
      ...this.plugins.map((plugin) =>
        from(plugin.onEntity(entity)).pipe(
          catchError((error) => {
            if (!this.silent) {
              console.error("Plugin error in onEntity:", error);
            }
            return of(undefined);
          })
        )
      )
    ).pipe(
      toArray(),
      map((): void => undefined)
    );
  }

  /**
   * Handle error event.
   */
  private handleError(error: Error): Observable<void> {
    return merge(
      ...this.plugins.map((plugin) =>
        from(plugin.onError(error)).pipe(
          catchError((err) => {
            if (!this.silent) {
              console.error("Plugin error in onError:", err);
            }
            return of(undefined);
          })
        )
      )
    ).pipe(
      toArray(),
      map((): void => undefined)
    );
  }

  /**
   * Handle export complete event.
   */
  private handleComplete(summary: ExportSummary): Observable<void> {
    return merge(
      ...this.plugins.map((plugin) =>
        from(plugin.onExportComplete(summary)).pipe(
          catchError((error) => {
            if (!this.silent) {
              console.error("Plugin error in onExportComplete:", error);
            }
            return of(undefined);
          })
        )
      )
    ).pipe(
      toArray(),
      map((): void => undefined)
    );
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
    await Promise.all(
      this.plugins.map(async (plugin) => {
        try {
          await plugin.cleanup();
        } catch (error) {
          if (!this.silent) {
            console.error("Plugin cleanup error:", error);
          }
        }
      })
    );
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
export class FSPlugin implements ExportPlugin {
  private fileMap: Map<string, string> = new Map();
  private activeEntityCount = 0;
  private silent = false;

  constructor(private config: Partial<ExporterConfig> = {}) {
    // Enable silent mode during testing
    this.silent = process.env.NODE_ENV === "test" || process.env.VITEST === "true";
  }

  onExportStart(config: ExporterConfig): Observable<void> {
    return new Observable<void>((subscriber) => {
      // Initialize filesystem access
      const outputDir = config.outputDir || "./notion-export";
      fs.mkdir(outputDir, { recursive: true })
        .then(() => {
          subscriber.next();
          subscriber.complete();
        })
        .catch((error) => {
          subscriber.error(error);
        });
    });
  }

  onEntity(entity: NotionEntity): Observable<void> {
    return new Observable<void>((subscriber) => {
      const entityPath = this.getPathForEntity(entity);
      try {
        this.activeEntityCount++;

        // Write entity to filesystem
        const outputDir = this.config.outputDir || "./notion-export";
        const entityDir = path.dirname(entityPath);

        fs.mkdir(entityDir, { recursive: true })
          .then(() => fs.writeFile(entityPath, JSON.stringify(entity, null, 2)))
          .then(() => {
            this.fileMap.set(entity.id, entityPath);
            subscriber.next();
            subscriber.complete();
          })
          .catch((error) => {
            subscriber.error(error);
          });
      } catch (error) {
        subscriber.error(error);
      }
    });
  }

  onExportComplete(summary: ExportSummary): Observable<void> {
    return new Observable<void>((subscriber) => {
      // Write summary file
      const summaryPath = path.join(this.config.outputDir || "./notion-export", "export-summary.json");
      fs.writeFile(summaryPath, JSON.stringify(summary, null, 2))
        .then(() => {
          subscriber.next();
          subscriber.complete();
        })
        .catch((error) => {
          subscriber.error(error);
        });
    });
  }

  onError(error: Error): Observable<void> {
    return new Observable<void>((subscriber) => {
      if (!this.silent) {
        console.error("[FSPlugin] Error:", error);
      }
      subscriber.next();
      subscriber.complete();
    });
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
  globalRegistry.register("fs", FSPlugin);

  // Setup plugin discovery - could be extended to scan directories
  // or load from npm packages in the future
  const silent = process.env.NODE_ENV === "test" || process.env.VITEST === "true";
  if (!silent) {
    console.log(`Plugin system initialized with ${globalRegistry.getAll().size} plugins`);
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
    console.log(`Plugin '${pluginName}' registered globally`);
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
export const defaultPlugins: Array<new () => ExportPlugin> = [FSPlugin];
