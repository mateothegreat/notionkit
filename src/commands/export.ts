import { log } from "$lib/utils/logging";
import { Command, Flags } from "@oclif/core";
import { blue, bold, green, red } from "ansis";
import ora from "ora";
import { createExportStream } from "../index";
import { ExportStream } from "../lib/services/export-stream";
import type { ExportEventPayload, ExportSummary } from "../lib/types";

/**
 * Export command for the Notion Sync CLI.
 *
 * Exports Notion workspace, database, or page content.
 */
export default class Export extends Command {
  static description = "Export Notion workspace, database, or page to desired format";

  static examples = [
    "<%= config.bin %> <%= command.id %> --token YOUR_TOKEN",
    "<%= config.bin %> <%= command.id %> --token YOUR_TOKEN --workspace WORKSPACE_ID",
    "<%= config.bin %> <%= command.id %> DATABASE_ID --token YOUR_TOKEN --output ./exports"
  ];

  static flags = {
    help: Flags.help({ char: "h" }),
    token: Flags.string({
      char: "t",
      description: "Notion integration token",
      required: true,
      env: "NOTION_TOKEN"
    }),
    workspace: Flags.string({
      char: "w",
      description: "Workspace ID to export",
      env: "NOTION_WORKSPACE"
    }),
    output: Flags.string({
      char: "o",
      description: "Output directory or destination",
      default: "./notion-export"
    }),
    "parallel-limit": Flags.integer({
      char: "p",
      description: "Number of parallel requests",
      default: 5
    }),
    "max-retries": Flags.integer({
      description: "Maximum number of retries for failed requests",
      default: 3
    }),
    "retry-delay": Flags.integer({
      description: "Initial delay between retries in ms",
      default: 1000
    }),
    verbose: Flags.boolean({
      char: "v",
      description: "Verbose output",
      default: false
    }),
    plugins: Flags.string({
      description: "Comma-separated list of plugins to load",
      multiple: true
    }),
    format: Flags.string({
      char: "f",
      description: "Export format",
      options: ["json", "markdown", "html"],
      default: "json"
    })
  };

  static args = {} as const;

  async run(): Promise<void> {
    const { argv, flags } = await this.parse(Export);
    const target = argv[0] as string | undefined;

    // Build configuration
    const config = {
      token: flags.token,
      workspace: flags.workspace || target,
      outputDir: flags.output,
      parallelLimit: flags["parallel-limit"],
      maxRetries: flags["max-retries"],
      retryDelay: flags["retry-delay"],
      debug: flags.verbose,
      plugins: this.loadPlugins(flags.plugins)
    };

    // Create export stream
    const stream = createExportStream(config);

    // Process the export
    await this.processExport(stream, target, flags.verbose);
  }

  /**
   * Load plugins safely with error handling.
   */
  private loadPlugins(pluginNames?: string[]): any[] {
    if (!pluginNames || pluginNames.length === 0) {
      return [];
    }

    const plugins: any[] = [];
    for (const pluginName of pluginNames) {
      try {
        const [name, ...args] = pluginName.split(":");
        const PluginClass = require(`../lib/plugins/${name}`).default;
        plugins.push(new PluginClass(...args));
      } catch (error) {
        this.warn(`Failed to load plugin "${pluginName}": ${error}`);
      }
    }
    return plugins;
  }

  /**
   * Process the export stream with progress indication.
   */
  private async processExport(stream: ExportStream, target?: string, verbose?: boolean): Promise<void> {
    const spinner = ora("Initializing export...").start();
    let progressInterval: NodeJS.Timeout | null = null;
    let currentProgress = { complete: 0, total: 0 };

    try {
      // Subscribe to events
      stream.onEvent().subscribe((event: ExportEventPayload) => {
        switch (event.type) {
          case "start":
            spinner.text = "Starting export...";
            break;
          case "entity":
            if (verbose) {
              spinner.text = `Processing ${event.entity.type} ${event.entity.id}`;
            }
            break;
          case "progress":
            currentProgress = { complete: event.complete, total: event.total };
            const percentage = event.total > 0 ? Math.round((event.complete / event.total) * 100) : 0;
            spinner.text = `Exporting... ${percentage}% (${event.complete}/${event.total})`;
            break;
          case "error":
            spinner.fail(`Error: ${event.error.message}`);
            if (event.entity) {
              this.warn(`Failed to process ${event.entity.type} ${event.entity.id}`);
            }
            break;
        }
      });

      // Execute the export
      const result = await stream.execute().toPromise();

      if (result?.success) {
        spinner.succeed("Export completed successfully!");
        this.displaySummary(result.summary);
      } else {
        spinner.fail("Export failed!");
        if (result?.summary) {
          this.displaySummary(result.summary);
        }
        this.exit(1);
      }
    } catch (error: any) {
      spinner.fail(`Export failed: ${error.message}`);
      log.error("Export failed", error);
      this.exit(1);
    } finally {
      if (progressInterval) {
        clearInterval(progressInterval);
      }
      await stream.cleanup();
    }
  }

  /**
   * Display export summary.
   */
  private displaySummary(summary: ExportSummary): void {
    log.info(bold("Export Summary:"));
    log.success(green(`✓ Successful: ${summary.successCount}`));

    if (summary.errorCount > 0) {
      log.error(red(`✗ Errors: ${summary.errorCount}`));
    }

    if (Object.keys(summary.processedTypes).length > 0) {
      Object.entries(summary.processedTypes).forEach(([type, count]) => {
        log.info(`  + processed ${type}: ${count}`);
      });
    }
    log.info(blue(`completed in ${(summary.duration / 1000).toFixed(2)}s`));
  }
}
