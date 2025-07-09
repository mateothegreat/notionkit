import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

const testInclude = ["./src/**/*.test.ts"];
const coverageInclude = ["./src/**/*.ts"];
const exclude = ["node_modules/**", "**/node_modules/**"];

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    include: testInclude,
    exclude,
    bail: 5,
    maxConcurrency: 10,
    passWithNoTests: false,
    isolate: true,
    silent: false,
    update: false,
    hideSkippedTests: true,
    name: "notion-sync",
    printConsoleTrace: false,
    typecheck: {
      enabled: true
    },
    benchmark: {
      outputJson: "./coverage/benchmark.json"
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      all: true,
      include: ["src/**/*.ts"],
      exclude: [...exclude, "**/*.test.ts", "**/*.d.ts"],
      enabled: true,
      clean: true,
      ignoreEmptyLines: true,
      reportsDirectory: "./coverage",
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
