import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

const include = ["./src/**/*.test.ts", "./test/**/*.test.ts"];
const exclude = ["node_modules/**", "**/node_modules/**"];

export default defineConfig({
  plugins: [tsconfigPaths()],
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
    pool: "forks",

    poolOptions: {
      threads: {
        execArgv: [
          // https://nodejs.org/api/cli.html#--cpu-prof
          "--cpu-prof",
          "--cpu-prof-dir=threads-profile",

          // https://nodejs.org/api/cli.html#--heap-prof
          "--heap-prof",
          "--heap-prof-dir=threads-profile"
        ],

        // Generate a single profile
        singleThread: true
      },

      forks: {
        execArgv: [
          // https://nodejs.org/api/cli.html#--cpu-prof
          "--cpu-prof",
          "--cpu-prof-dir=forks-profile",

          // https://nodejs.org/api/cli.html#--heap-prof
          "--heap-prof",
          "--heap-prof-dir=forks-profile"
        ],

        // Generate a single profile
        singleFork: true
      }
    },
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
