import { Config } from "$lib/config/config";

/**
 * Export configuration controlling the export process.
 *
 * @param token - Required Notion API token for authentication
 * @param workspace - Optional workspace ID to limit export scope
 * @param outputDir - Optional output directory for exported files
 * @param parallelLimit - Optional limit for parallel API requests
 * @param maxRetries - Optional maximum retry attempts for failed requests
 * @param retryDelay - Optional delay in milliseconds between retries
 * @param plugins - Optional array of plugin names to load
 * @param debug - Optional flag to enable debug logging
 */
export class ExportConfig extends Config {
  constructor(config: Config) {
    super(config);
  }
}
