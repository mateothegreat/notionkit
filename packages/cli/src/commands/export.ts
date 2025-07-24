import { ExportConfig } from "$commands/export/config";
import { Factory } from "$lib/factory";
import { display } from "$lib/util";
import { log } from "$lib/util/logging";
import { BundledPluginMap, PluginFromFlag } from "$plugins/bundled";
import { SearchOperator } from "@notion.codes/sdk/operators/search";
import type { SearchResponse } from "@notion.codes/types";
import { Args, Command, Flags } from "@oclif/core";
import { firstValueFrom, fromEvent, reduce, takeUntil, tap, type Subscription } from "rxjs";

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
    plugins: Flags.custom<PluginFromFlag[]>({
      /**
       *
       * FlagParserContext isn't exported from oclif/core, so we need to use any here.
       * eslint-disable-next-line @typescript-eslint/no-explicit-any
       */
      parse: async (input: string, context: any) => {
        const validPlugins = Object.keys(BundledPluginMap);
        return input.split(",").map((split) => {
          const [id, path, ...args] = split.split(":");
          if (!validPlugins.includes(id)) {
            log.error(`Invalid plugin "${id}". Available plugins: [${validPlugins.join(", ")}]`);
            context.exit(1);
          }
          return PluginFromFlag.fromFlag(id, path, args);
        });
      }
    })({
      char: "p",
      description: "Comma-separated list of plugins to load."
    }),
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
      char: "c",
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
    format: Flags.string({
      char: "f",
      description: "Export format",
      options: ["json", "markdown", "html"],
      default: "json"
    })
  };
  static override args = {
    file: Args.string({ description: "file to read" })
  };
  async run(): Promise<void> {
    const { argv, flags } = await this.parse();
    const target = argv[0] as string | undefined;
    const config = new ExportConfig({
      token: flags.token,
      workspace: flags.workspace || target,
      outputDir: flags.output,
      parallelLimit: flags["parallel-limit"],
      maxRetries: flags["max-retries"],
      retryDelay: flags["retry-delay"],
      debug: flags.verbose,
      plugins: flags.plugins
    });
    // console.log("config", config);

    const factory = Factory.fromConfig(config);

    const operator = new SearchOperator();
    const subscriptions = new Set<Subscription>();
    const abortController = new AbortController();

    for (const signal of ["SIGINT", "SIGTERM"]) {
      process.on(signal, () => {
        abortController.abort();
      });
    }

    const cleanup = () => {
      subscriptions.forEach((subscription) => subscription.unsubscribe());
      subscriptions.clear();
      monitor.stop("export complete");
    };

    abortController.signal.addEventListener("abort", cleanup);

    const res = operator.execute(
      {
        filter: {
          value: "page",
          property: "object"
        },
        page_size: 100
      },
      {
        baseUrl: "https://api.notion.com/v1",
        headers: {
          Authorization: `Bearer ${config.token}`,
          "Notion-Version": "2022-06-28"
        },
        timeout: 15_000
      },
      {
        limits: {
          results: 1
        }
      }
    );

    const monitor = display();

    let startTime = Date.now();

    subscriptions.add(
      res.reporter.metrics$.subscribe((metrics) => {
        monitor.next({
          duration: Date.now() - startTime,
          success: metrics.total - metrics.errors,
          error: metrics.errors,
          throughput: metrics.total / ((Date.now() - startTime) / 1000)
        });
      })
    );

    // subscriptions.add(
    //   res.raw$.subscribe({
    //     next: (response) => {
    //       console.log("response", response);
    //     }
    //   })
    // );

    monitor.start();

    const results = await firstValueFrom(
      res.data$.pipe(
        tap((page) => {
          monitor.next({
            messages: page.results.map((result) => result.url)
          });
        }),
        takeUntil(fromEvent(abortController.signal, "abort")),
        reduce((acc, page) => acc.concat(page.results), [] as SearchResponse["results"])
      )
    );

    cleanup();
    console.log("results", results.length);
  }

  protected async catch(err: Error & { exitCode?: number }): Promise<any> {
    return super.catch(err);
  }

  protected async finally(_: Error | undefined): Promise<any> {
    return super.finally(_);
  }

  // /**
  //  * Load plugins safely with error handling.
  //  */
  // private loadPlugins(pluginNames?: string[]): any[] {
  //   if (!pluginNames || pluginNames.length === 0) {
  //     return [];
  //   }

  //   const plugins: any[] = [];
  //   for (const pluginName of pluginNames) {
  //     try {
  //       const [name, ...args] = pluginName.split(":");
  //       const PluginClass = require(`../lib/plugins/${name}`).default;
  //       plugins.push(new PluginClass(...args));
  //     } catch (error) {
  //       this.warn(`Failed to load plugin "${pluginName}": ${error}`);
  //     }
  //   }
  //   return plugins;
  // }

  // /**
  //  * Process the export stream with progress indication.
  //  */
  // private processExport(stream: ExportStream, target?: string, verbose?: boolean): Promise<void> {
  //   return new Promise<void>((resolve, reject) => {
  //     const spinner = ora("Initializing export...").start();
  //     let currentProgress = { complete: 0, total: 0 };

  //     // Subscribe to events
  //     const eventSubscription = stream.onEvent().subscribe((event: ExportEventPayload) => {
  //       switch (event.type) {
  //         case "start":
  //           spinner.text = "Starting export...";
  //           break;
  //         case "entity":
  //           if (verbose) {
  //             spinner.text = `Processing ${event.entity.type} ${event.entity.id}`;
  //           }
  //           break;
  //         case "progress":
  //           currentProgress = { complete: event.complete, total: event.total };
  //           const percentage = event.total > 0 ? Math.round((event.complete / event.total) * 100) : 0;
  //           spinner.text = `Exporting... ${percentage}% (${event.complete}/${event.total})`;
  //           break;
  //         case "error":
  //           spinner.fail(`Error: ${event.error.message}`);
  //           if (event.entity) {
  //             this.warn(`Failed to process ${event.entity.type} ${event.entity.id}`);
  //           }
  //           break;
  //       }
  //     });

  //     // Execute the export
  //     const executeSubscription = stream.execute().subscribe({
  //       next: (result) => {
  //         if (result?.success) {
  //           spinner.succeed("Export completed successfully!");
  //           this.displaySummary(result.summary);
  //         } else {
  //           spinner.fail("Export failed!");
  //           if (result?.summary) {
  //             this.displaySummary(result.summary);
  //           }
  //           this.exit(1);
  //         }
  //       },
  //       error: (error: any) => {
  //         spinner.fail(`Export failed: ${error.message}`);
  //         log.error("Export failed", error);

  //         // Cleanup
  //         eventSubscription.unsubscribe();
  //         stream.cleanup().subscribe({
  //           complete: () => {
  //             this.exit(1);
  //           },
  //           error: () => {
  //             this.exit(1);
  //           }
  //         });
  //       },
  //       complete: () => {
  //         // Cleanup
  //         eventSubscription.unsubscribe();
  //         stream.cleanup().subscribe({
  //           complete: () => {
  //             resolve();
  //           },
  //           error: (cleanupError) => {
  //             log.error("Cleanup failed", cleanupError);
  //             resolve(); // Still resolve as main operation completed
  //           }
  //         });
  //       }
  //     });
  //   });
  // }

  // /**
  //  * Display export summary.
  //  */
  // private displaySummary(summary: ExportSummary): void {
  //   log.info(bold("Export Summary:"));
  //   log.success(green(`✓ Successful: ${summary.successCount}`));

  //   if (summary.errorCount > 0) {
  //     log.error(red(`✗ Errors: ${summary.errorCount}`));
  //   }

  //   if (Object.keys(summary.processedTypes).length > 0) {
  //     Object.entries(summary.processedTypes).forEach(([type, count]) => {
  //       log.info(`  + processed ${type}: ${count}`);
  //     });
  //   }
  //   log.info(blue(`completed in ${(summary.duration / 1000).toFixed(2)}s`));
  // }
}
