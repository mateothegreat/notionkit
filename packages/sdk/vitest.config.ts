import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

const include = ["./src/**/*.test.ts", "./test/**/*.test.ts"];
const exclude = ["node_modules/**", "**/node_modules/**"];

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    include,
    exclude,
    globalSetup: ["vitest.setup.ts"],
    bail: 5,
    maxConcurrency: 10,
    typecheck: {
      enabled: true
    },
    benchmark: {
      outputJson: "./coverage/benchmark.json"
    },
    pool: "forks",
    poolOptions: {
      threads: {
        singleThread: true,
        execArgv: [
          // https://nodejs.org/api/cli.html#--cpu-prof
          "--cpu-prof",
          "--cpu-prof-dir=/tmp/threads-profile",

          // https://nodejs.org/api/cli.html#--heap-prof
          "--heap-prof",
          "--heap-prof-dir=/tmp/threads-profile"
        ]
      },
      forks: {
        singleFork: true,
        execArgv: [
          // https://nodejs.org/api/cli.html#--cpu-prof
          "--cpu-prof",
          "--cpu-prof-dir=/tmp/forks-profile",
          // https://nodejs.org/api/cli.html#--heap-prof
          "--heap-prof",
          "--heap-prof-dir=/tmp/forks-profile"
        ]
      }
    },
    coverage: {
      provider: "v8",
      reporter: ["json"],
      extension: [".ts"],
      include: ["src/**/*.ts"],
      exclude: [...exclude, "**/*.test.ts", "**/*.d.ts"],
      enabled: true,
      experimentalAstAwareRemapping: true,
      ignoreEmptyLines: true,
      reportsDirectory: "./coverage",
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
