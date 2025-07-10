import type { Command } from "@oclif/core";
import * as fs from "fs/promises";
import * as path from "path";
import { from, merge, Observable, of, Subject } from "rxjs";
import { catchError, map, mergeMap, tap, toArray } from "rxjs/operators";
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
   * @returns Observable that completes when cleanup is done
   */
  cleanup(): Observable<void>;
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
        // Handle events using observables
        this.handleEventObservable(payload).subscribe({
          error: (error) => {
            if (!this.silent) {
              log.error("ExportPluginManager:eventHandling", error);
            }
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
   * Handle events using observables.
   */
  private handleEventObservable(payload: ExportEventPayload): Observable<void> {
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
  }

  /**
   * Handle export start event.
   */
  private handleStart(config: ExporterConfig): Observable<void> {
    if (this.plugins.length === 0) {
      return of(undefined);
    }

    return merge(
      ...this.plugins.map((plugin) =>
        plugin.onExportStart(config).pipe(
          catchError((error) => {
            if (!this.silent) {
              log.error("ExportPluginManager:handleStart", error);
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
    if (this.plugins.length === 0) {
      return of(undefined);
    }

    return merge(
      ...this.plugins.map((plugin) =>
        plugin.onEntity(entity).pipe(
          catchError((error) => {
            if (!this.silent) {
              log.error("ExportPluginManager:handleEntity", error);
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
    if (this.plugins.length === 0) {
      return of(undefined);
    }

    return merge(
      ...this.plugins.map((plugin) =>
        plugin.onError(error).pipe(
          catchError((err) => {
            if (!this.silent) {
              log.error("ExportPluginManager:handleError", err);
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
    if (this.plugins.length === 0) {
      return of(undefined);
    }

    return merge(
      ...this.plugins.map((plugin) =>
        plugin.onExportComplete(summary).pipe(
          catchError((error) => {
            if (!this.silent) {
              log.error("ExportPluginManager:handleComplete", error);
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
   * @returns Observable that completes when all plugins are cleaned up
   */
  cleanup(): Observable<void> {
    if (this.plugins.length === 0) {
      return of(undefined);
    }

    return merge(
      ...this.plugins.map((plugin) =>
        plugin.cleanup().pipe(
          catchError((error) => {
            if (!this.silent) {
              log.error("ExportPluginManager:cleanup", error);
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
        log.info(`FileSystemPlugin initialized with output directory: ${outputDir}`);
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

    return from(fs.mkdir(entityDir, { recursive: true })).pipe(
      mergeMap(() => from(fs.writeFile(entityPath, JSON.stringify(entity, null, 2)))),
      tap(() => {
        this.fileMap.set(entity.id, entityPath);
      }),
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

  cleanup(): Observable<void> {
    // Close any pending file handles
    this.fileMap.clear();
    this.activeEntityCount = 0;
    return of(undefined);
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
