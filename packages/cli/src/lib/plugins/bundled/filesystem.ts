import type { Channel } from "$lib/message-bus/channel";
import { log } from "$lib/util/logging";
import { type Plugin, PluginEvent, type PluginEventPayload } from "../plugin";

/**
 * Filesystem plugin for exporting entities to files.
 *
 * Writes entities to the filesystem in JSON format.
 */
export class FileSystemPlugin implements Plugin {
  channel: Channel;
  id = "filesystem";
  events: PluginEvent[] = [
    PluginEvent.START,
    PluginEvent.PROGRESS,
    PluginEvent.COMPLETE,
    PluginEvent.SHUTDOWN,
    PluginEvent.ERROR,
    PluginEvent.DATA
  ];

  handler(event: PluginEvent, data: PluginEventPayload<PluginEvent>["data"]): void {
    switch (event) {
      case PluginEvent.START:
        log.debug("filesystem:handler:start", data);
        break;
      case PluginEvent.PROGRESS:
        log.debug("filesystem:handler:progress", data);
        break;
    }
  }

  cleanup(): void {
    throw new Error("Method not implemented.");
  }

  // /**
  //  * Initialize the plugin and create output directory.
  //  */
  // onExportStart(config: ExportConfig): Observable<void> {
  //   const outputDir = this.config.outputDir || config.outputDir || "./notion-export";

  //   return from(fs.mkdir(outputDir, { recursive: true })).pipe(
  //     tap(() => {
  //       if (!this.silent) {
  //         log.info(`FileSystemPlugin initialized with output directory: ${outputDir}`);
  //       }
  //     }),
  //     map(() => {}),
  //     catchError((error) => {
  //       if (!this.silent) {
  //         log.error("FileSystemPlugin:onExportStart", error);
  //       }
  //       return of(undefined);
  //     })
  //   );
  // }

  // /**
  //  * Write entity to filesystem.
  //  */
  // onEntity(entity: NotionEntity): Observable<void> {
  //   const entityPath = this.getPathForEntity(entity);
  //   const entityDir = path.dirname(entityPath);

  //   this.activeEntityCount++;

  //   return from(fs.mkdir(entityDir, { recursive: true })).pipe(
  //     // Chain the file write operation
  //     tap(() => from(fs.writeFile(entityPath, JSON.stringify(entity, null, 2)))),
  //     tap(() => {
  //       if (!this.silent) {
  //         log.success(`Entity written to: ${entityPath}`);
  //       }
  //       this.fileMap.set(entity.id, entityPath);
  //     }),
  //     map(() => {}),
  //     catchError((error) => {
  //       if (!this.silent) {
  //         log.error("FileSystemPlugin:onEntity", error);
  //       }
  //       return of(undefined);
  //     })
  //   );
  // }

  // /**
  //  * Write export summary to filesystem.
  //  */
  // onExportComplete(summary: ExportSummary): Observable<void> {
  //   const outputDir = this.config.outputDir || "./notion-export";
  //   const summaryPath = path.join(outputDir, "export-summary.json");

  //   return from(fs.writeFile(summaryPath, JSON.stringify(summary, null, 2))).pipe(
  //     tap(() => {
  //       if (!this.silent) {
  //         log.success(`Export completed. Summary written to: ${summaryPath}`);
  //       }
  //     }),
  //     map(() => {}),
  //     catchError((error) => {
  //       if (!this.silent) {
  //         log.error("FileSystemPlugin:onExportComplete", error);
  //       }
  //       return of(undefined);
  //     })
  //   );
  // }

  // /**
  //  * Handle errors gracefully.
  //  */
  // onError(error: Error): Observable<void> {
  //   return of(undefined).pipe(
  //     tap(() => {
  //       if (!this.silent) {
  //         log.error("FileSystemPlugin:onError", error);
  //       }
  //     })
  //   );
  // }

  // /**
  //  * Cleanup plugin resources.
  //  */
  // cleanup(): Observable<void> {
  //   this.fileMap.clear();
  //   this.activeEntityCount = 0;
  //   return of(undefined);
  // }

  // /**
  //  * Get filesystem path for an entity.
  //  */
  // private getPathForEntity(entity: NotionEntity): string {
  //   const baseDir = this.config.outputDir || "./notion-export";
  //   const typeDir = path.join(baseDir, entity.type);
  //   return path.join(typeDir, `${entity.id}.json`);
  // }
}
