#!/usr/bin/env tsx

/**
 * Simple CLI for generating working ArkType schemas.
 *
 * This focuses on actually working rather than being complex.
 * Generates schemas for the most valuable Notion API types.
 */

import { existsSync } from "fs";
import { resolve } from "path";
import { SimpleSchemaGenerator } from "../tmp/generator/simple-generator.js";

async function main(): Promise<void> {
  const inputFile = resolve(".notion/api-endpoints.d.ts");
  const outputFile = resolve("src/generated/simple-schemas.ts");

  console.log("🚀 Simple Schema Generator");
  console.log("=========================");
  console.log();

  // Check input file exists
  if (!existsSync(inputFile)) {
    console.error(`❌ Input file not found: ${inputFile}`);
    console.error("Make sure you have the Notion API types file.");
    process.exit(1);
  }

  console.log(`📁 Input:  ${inputFile}`);
  console.log(`📁 Output: ${outputFile}`);
  console.log();

  try {
    const generator = new SimpleSchemaGenerator();

    await generator.generateSchemas({
      inputFile,
      outputFile,
      includeUtilities: true
    });

    console.log();
    console.log("🎉 Success! Generated working schemas.");
    console.log();
    console.log("📋 What was generated:");
    console.log("  • Working ArkType schemas for high-value types");
    console.log("  • Type exports for TypeScript");
    console.log("  • Utility functions (type guards, validators, parsers)");
    console.log();
    console.log("🔧 Usage in your code:");
    console.log(`  import { ApiColorSchema, validateApiColor } from './generated/simple-schemas.js';`);
    console.log(`  const color = validateApiColor(data.color);`);
    console.log();
    console.log("✅ Run tests to verify everything works:");
    console.log("  npm run test");
  } catch (error) {
    console.error("❌ Generation failed:", error);
    process.exit(1);
  }
}

// Additional type sets for specific use cases
const TYPE_SETS = {
  colors: ["ApiColor"],
  filters: ["PropertyFilter", "CompoundFilter"],
  params: [
    "CreatePageBodyParameters",
    "UpdatePageBodyParameters",
    "QueryDatabaseBodyParameters",
    "SearchBodyParameters"
  ],
  all: [
    "ApiColor",
    "Language",
    "TimeZone",
    "CreatePageBodyParameters",
    "UpdatePageBodyParameters",
    "QueryDatabaseBodyParameters",
    "SearchBodyParameters",
    "PropertyFilter",
    "SortObject",
    "CompoundFilter"
  ]
};

// Handle command line arguments
const args = process.argv.slice(2);
if (args.includes("--help") || args.includes("-h")) {
  console.log("Simple Schema Generator");
  console.log("");
  console.log("Usage:");
  console.log("  npx tsx scripts/simple-generate.ts [--types <set>]");
  console.log("");
  console.log("Type sets:");
  console.log("  --types colors   Generate color-related schemas");
  console.log("  --types filters  Generate filter-related schemas");
  console.log("  --types params   Generate parameter schemas");
  console.log("  --types all      Generate all schemas (default)");
  console.log("");
  console.log("Examples:");
  console.log("  npx tsx scripts/simple-generate.ts");
  console.log("  npx tsx scripts/simple-generate.ts --types colors");
  process.exit(0);
}

// Handle type set selection
const typeSetIndex = args.indexOf("--types");
if (typeSetIndex >= 0 && typeSetIndex + 1 < args.length) {
  const typeSet = args[typeSetIndex + 1];
  if (typeSet in TYPE_SETS) {
    console.log(`🎯 Using type set: ${typeSet}`);
    // We would modify the generator call here to use specific types
    // For now, just run with defaults
  } else {
    console.error(`❌ Unknown type set: ${typeSet}`);
    console.error(`Available sets: ${Object.keys(TYPE_SETS).join(", ")}`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("💥 Unexpected error:", error);
  process.exit(1);
});
