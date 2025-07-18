#!/usr/bin/env tsx

/**
 * CLI script for generating focused ArkType schemas from Notion API endpoint types.
 *
 * This enhanced script uses the focused generator infrastructure to convert high-value
 * TypeScript types from @api-endpoints.d.ts into ArkType schemas for runtime validation.
 *
 * Key improvements:
 * - Focuses on high-value complex types
 * - Integrates with existing manual schemas
 * - Generates utility functions
 * - Creates organized output files
 *
 * Usage:
 *   npm run generate:schemas
 *   tsx scripts/generate-schemas.ts [options]
 *
 * Options:
 *   --input <path>        Input TypeScript file (default: .notion/api-endpoints.d.ts)
 *   --output <dir>        Output directory (default: src/generated)
 *   --target <types>      Comma-separated list of specific types to generate
 *   --mode <mode>         Integration mode: standalone|extend|replace (default: extend)
 *   --complexity <level>  Max complexity: simple|medium|complex (default: complex)
 *   --no-utilities        Skip generating utility functions
 *   --verbose             Enable verbose logging
 *   --help                Show this help message
 */

import ansis from "ansis";
import { existsSync } from "fs";
import { resolve } from "path";
import { parseArgs } from "util";
import { FocusedSchemaGenerator } from "../tmp/generator/generator.js";

interface CliOptions {
  input: string;
  output: string;
  target?: string[];
  mode: "standalone" | "extend" | "replace";
  complexity: "simple" | "medium" | "complex";
  utilities: boolean;
  verbose: boolean;
  help: boolean;
}

/**
 * High-value type sets for different use cases.
 */
const TYPE_SETS = {
  // Essential types for basic SDK functionality
  essential: ["PageObjectResponse", "DatabaseObjectResponse", "BlockObjectResponse", "RichTextItemResponse"],

  // API parameter types for request/response handling
  api: [
    "CreatePageBodyParameters",
    "UpdatePageBodyParameters",
    "QueryDatabaseBodyParameters",
    "SearchBodyParameters",
    "AppendBlockChildrenBodyParameters"
  ],

  // Property and filtering types
  properties: ["PropertyFilter", "PropertyItemObjectResponse", "DatabasePropertyConfigResponse"],

  // All high-value types (default)
  all: [
    // Page types
    "PageObjectResponse",
    "PartialPageObjectResponse",
    "CreatePageBodyParameters",
    "UpdatePageBodyParameters",

    // Database types
    "DatabaseObjectResponse",
    "PartialDatabaseObjectResponse",
    "QueryDatabaseBodyParameters",
    "CreateDatabaseBodyParameters",
    "UpdateDatabaseBodyParameters",

    // Block types
    "BlockObjectResponse",
    "BlockObjectRequest",
    "BlockObjectRequestWithoutChildren",
    "BlockObjectWithSingleLevelOfChildrenRequest",

    // Property types
    "PropertyFilter",
    "PropertyItemObjectResponse",
    "DatabasePropertyConfigResponse",

    // Content types
    "RichTextItemResponse",
    "RichTextItemRequest",

    // API types
    "SearchBodyParameters",
    "ListCommentsQueryParameters",
    "AppendBlockChildrenBodyParameters"
  ]
};

/**
 * Parses command line arguments and returns CLI options.
 */
function parseCliArgs(): CliOptions {
  const { values, positionals } = parseArgs({
    args: process.argv.slice(2),
    options: {
      input: {
        type: "string",
        short: "i",
        default: ".notion/api-endpoints.d.ts"
      },
      output: {
        type: "string",
        short: "o",
        default: "src/generated"
      },
      target: {
        type: "string",
        short: "t"
      },
      mode: {
        type: "string",
        short: "m",
        default: "extend"
      },
      complexity: {
        type: "string",
        short: "c",
        default: "complex"
      },
      "no-utilities": {
        type: "boolean",
        default: false
      },
      verbose: {
        type: "boolean",
        short: "v",
        default: false
      },
      help: {
        type: "boolean",
        short: "h",
        default: false
      }
    },
    allowPositionals: true
  });

  // Parse target types
  let targetTypes: string[] | undefined;

  if (values.target) {
    if (values.target in TYPE_SETS) {
      targetTypes = TYPE_SETS[values.target as keyof typeof TYPE_SETS];
      console.log(ansis.cyan(`📋 Using predefined type set: ${values.target} (${targetTypes.length} types)`));
    } else {
      targetTypes = values.target
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      console.log(ansis.cyan(`📋 Using custom types: ${targetTypes.join(", ")}`));
    }
  }

  // Validate mode
  const validModes = ["standalone", "extend", "replace"];
  if (values.mode && !validModes.includes(values.mode)) {
    console.error(ansis.red(`❌ Invalid mode: ${values.mode}. Must be one of: ${validModes.join(", ")}`));
    process.exit(1);
  }

  // Validate complexity
  const validComplexities = ["simple", "medium", "complex"];
  if (values.complexity && !validComplexities.includes(values.complexity)) {
    console.error(
      ansis.red(`❌ Invalid complexity: ${values.complexity}. Must be one of: ${validComplexities.join(", ")}`)
    );
    process.exit(1);
  }

  return {
    input: resolve(process.cwd(), values.input as string),
    output: resolve(process.cwd(), values.output as string),
    target: targetTypes,
    mode: (values.mode as any) || "extend",
    complexity: (values.complexity as any) || "complex",
    utilities: !values["no-utilities"],
    verbose: Boolean(values.verbose),
    help: Boolean(values.help)
  };
}

/**
 * Displays help information.
 */
function showHelp(): void {
  console.log(ansis.bold("Focused Schema Generator"));
  console.log();
  console.log("Generates focused ArkType schemas from Notion API types.");
  console.log();
  console.log(ansis.bold("Usage:"));
  console.log("  tsx scripts/generate-schemas.ts [options]");
  console.log();
  console.log(ansis.bold("Options:"));
  console.log("  -i, --input <path>        Input TypeScript file");
  console.log("  -o, --output <dir>        Output directory");
  console.log("  -t, --target <types>      Target types (comma-separated or preset)");
  console.log("  -m, --mode <mode>         Integration mode");
  console.log("  -c, --complexity <level>  Maximum complexity level");
  console.log("      --no-utilities        Skip utility function generation");
  console.log("  -v, --verbose             Enable verbose logging");
  console.log("  -h, --help                Show this help");
  console.log();
  console.log(ansis.bold("Target Type Presets:"));
  console.log("  essential    Core types for basic functionality");
  console.log("  api          API parameter types");
  console.log("  properties   Property and filter types");
  console.log("  all          All high-value types (default)");
  console.log();
  console.log(ansis.bold("Integration Modes:"));
  console.log("  standalone   Generate independent schemas");
  console.log("  extend       Extend existing manual schemas (default)");
  console.log("  replace      Replace existing schemas");
  console.log();
  console.log(ansis.bold("Examples:"));
  console.log("  tsx scripts/generate-schemas.ts");
  console.log("  tsx scripts/generate-schemas.ts --target essential");
  console.log("  tsx scripts/generate-schemas.ts --target PageObjectResponse,BlockObjectResponse");
  console.log("  tsx scripts/generate-schemas.ts --mode standalone --complexity simple");
}

/**
 * Validates that the input file exists and is readable.
 */
function validateInputFile(inputPath: string): void {
  if (!existsSync(inputPath)) {
    console.error(ansis.red.bold("❌ Error:"), `Input file not found: ${inputPath}`);
    console.error(ansis.yellow("💡 Tip:"), "Make sure the Notion API types file exists");
    process.exit(1);
  }

  console.log(ansis.green("✅"), `Input file found: ${ansis.dim(inputPath)}`);
}

/**
 * Logs verbose information if verbose mode is enabled.
 */
function logVerbose(verbose: boolean, message: string, ...args: any[]): void {
  if (verbose) {
    console.log(ansis.dim("🔍"), ansis.dim(message), ...args);
  }
}

/**
 * Displays a summary of the generation process.
 */
function displaySummary(options: CliOptions, startTime: number, success: boolean): void {
  const duration = Date.now() - startTime;
  const durationStr = duration > 1000 ? `${(duration / 1000).toFixed(1)}s` : `${duration}ms`;

  console.log();
  console.log(ansis.bold("📊 Generation Summary"));
  console.log(ansis.gray("─".repeat(50)));
  console.log(`${ansis.bold("Input:")}     ${options.input}`);
  console.log(`${ansis.bold("Output:")}    ${options.output}`);
  console.log(`${ansis.bold("Max Types:")} ${options.maxTypes || "unlimited"}`);
  console.log(`${ansis.bold("Duration:")}  ${durationStr}`);
  console.log(`${ansis.bold("Status:")}    ${success ? ansis.green("✅ Success") : ansis.red("❌ Failed")}`);

  if (success) {
    console.log();
    console.log(ansis.green.bold("🎉 Schema generation completed successfully!"));
    console.log(ansis.yellow("📝 Next steps:"));
    console.log("  • Run tests:", ansis.cyan("npm run test"));
    console.log("  • Check types:", ansis.cyan("npm run check"));
    console.log("  • Build project:", ansis.cyan("npm run build"));
  }
}

/**
 * Main CLI function.
 */
async function main(): Promise<void> {
  const startTime = Date.now();
  let success = false;
  let options: CliOptions = parseCliArgs();

  try {
    // Show help if requested
    if (options.help) {
      showHelp();
      return;
    }

    // Display banner
    console.log(ansis.bold.cyan("🚀 NotionKit Schema Generator"));
    console.log(ansis.gray("Converting Notion API types to ArkType schemas..."));
    console.log();

    // Validate input file
    validateInputFile(options.input);

    logVerbose(options.verbose, "CLI options:", options);

    // Initialize the schema generator
    const generator = new FocusedSchemaGenerator();

    logVerbose(options.verbose, "Initializing schema generator...");

    // Generate schemas
    console.log(ansis.blue("⚙️"), "Generating schemas...");

    await generator.generateFocusedSchemas({
      inputFile: options.input,
      outputDir: options.output,
      targetTypes: options.target,
      includeUtilities: options.utilities,
      integrationMode: options.mode,
      maxComplexity: options.complexity
    });

    // Validate schemas if requested
    if (options.validate) {
      console.log(ansis.blue("🔍"), "Validating generated schemas...");

      const isValid = await generator.validateSchemas(options.output);

      if (!isValid) {
        console.error(ansis.red("❌"), "Schema validation failed");
        process.exit(1);
      }

      console.log(ansis.green("✅"), "Schema validation passed");
    }

    success = true;
  } catch (error) {
    console.error();
    console.error(ansis.red.bold("💥 Schema generation failed:"));

    if (error instanceof Error) {
      console.error(ansis.red("Error:"), error.message);

      console.error(ansis.dim("Stack trace:"));
      console.error(ansis.dim(error.stack));
    } else {
      console.error(ansis.red("Unknown error:"), error);
    }

    console.error();
    console.error(ansis.yellow("💡 Troubleshooting tips:"));
    console.error("  • Check that the input file exists and is valid TypeScript");
    console.error("  • Try using --max-types to limit the number of types processed");
    console.error("  • Use --skip-complex to avoid problematic complex types");
    console.error("  • Enable --verbose for more detailed error information");

    process.exit(1);
  } finally {
    // Always display summary
    displaySummary(options, startTime, success);
  }
}

// Enhanced error handling
process.on("uncaughtException", (error) => {
  console.error();
  console.error(ansis.red.bold("💥 Uncaught exception:"));
  console.error(ansis.red(error.message));
  if (error.stack) {
    console.error(ansis.dim(error.stack));
  }
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  console.error();
  console.error(ansis.red.bold("💥 Unhandled rejection:"));
  console.error(ansis.red(String(reason)));
  process.exit(1);
});

// Handle SIGINT (Ctrl+C) gracefully
process.on("SIGINT", () => {
  console.log();
  console.log(ansis.yellow("⚠️  Generation interrupted by user"));
  process.exit(0);
});

// Run the CLI
main().catch((error) => {
  console.error(ansis.red.bold("💥 Main function failed:"), error);
  process.exit(1);
});
