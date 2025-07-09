import type { Command } from "@oclif/core";
import * as fs from "fs/promises";
import * as path from "path";
import { from, merge, Observable, of, Subject } from "rxjs";
import { catchError, mergeMap } from "rxjs/operators";
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

  constructor(private pluginClasses: Array<new () => ExportPlugin>) {
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
        console.error(`Failed to initialize plugin ${PluginClass.name}`, error);
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
            console.error("Plugin error in onExportStart:", error);
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
            console.error("Plugin error in onEntity:", error);
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
            console.error("Plugin error in onError:", err);
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
            console.error("Plugin error in onExportComplete:", error);
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
          console.error("Plugin cleanup error:", error);
        }
      })
    );
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

  constructor(private config: Partial<ExporterConfig> = {}) {}

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
        // TODO: Write entity to filesystem
        subscriber.next();
        subscriber.complete();
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
      console.error("[FSPlugin] Error:", error);
      subscriber.next();
      subscriber.complete();
    });
  }

  cleanup(): Promise<void> {
    // Close any pending file handles
    this.fileMap.clear();
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
}

/**
 * Initialize the plugin system.
 *
 * @param commands - CLI commands to enhance with plugin support
 */
export function initPluginSystem(commands: Command[]): void {
  // Setup plugin discovery and initialization
  // This could scan for plugins in specific directories
  // or load from npm packages
}

/**
 * Register a plugin globally.
 *
 * @param plugin - Plugin instance to register
 */
export function registerPlugin(plugin: ExportPlugin): void {
  // Global plugin registration logic
  // This could maintain a registry of available plugins
}

/**
 * Default plugins that are always loaded.
 */
export const defaultPlugins: Array<new () => ExportPlugin> = [FSPlugin];

// Import required RxJS operators
import { map, toArray } from "rxjs/operators";
