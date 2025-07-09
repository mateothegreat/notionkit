import type { Command } from "@oclif/core";
import { initPluginSystem } from "./lib/plugins";
import { ExportStream } from "./lib/services/export-stream";
import type { ExporterConfig } from "./lib/types";

// Export all public types and interfaces
export * from "./lib/plugins";
export * from "./lib/services/export-stream";
export * from "./lib/types";

/**
 * Create a new export stream with the provided configuration.
 *
 * @param config - Export configuration
 * @returns Configured export stream instance
 */
export function createExportStream(config: ExporterConfig): ExportStream {
  const stream = new ExportStream(config);
  return stream;
}

/**
 * Initialize the plugin system with CLI commands.
 *
 * @param commands - Array of oclif commands to enhance
 */
export function initializePlugins(commands: Command[]): void {
  initPluginSystem(commands);
}
