import { defineConfig } from "vitest/config";

const include = ["./src/**/*.test.ts", "./test/**/*.test.ts"];
const exclude = ["node_modules/**", "**/node_modules/**"];

export default defineConfig({
  resolve: {
    alias: {
      $util: "./src/lib/util",
      $schemas: "./src/lib/schemas",
      $api: "./src/lib/api",
      $core: "./src/lib/core",
      $clients: "./src/lib/clients",
      $operators: "./src/lib/operators"
    }
  },
  test: {
    include,
    exclude,
    bail: 5,
    maxConcurrency: 10,
    passWithNoTests: false,
    isolate: true,
    silent: false,
    update: false,
    hideSkippedTests: true,
    typecheck: {
      enabled: true
    },
    benchmark: {
      outputJson: "./coverage/benchmark.json"
    },
    globalSetup: ["vitest.setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      extension: [".ts"],
      all: true,
      include: ["src/**/*.ts"],
      exclude: [...exclude, "**/*.test.ts", "**/*.d.ts"],
      enabled: true,
      clean: true,
      ignoreEmptyLines: true,
      reportsDirectory: "./coverage",
      cleanOnRerun: true,
      reportOnFailure: true,
      processingConcurrency: 10,
      watermarks: {
        branches: [80, 100],
        functions: [80, 100],
        lines: [80, 100],
        statements: [80, 100]
      },
      thresholds: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80
      }
    }
  }
});
