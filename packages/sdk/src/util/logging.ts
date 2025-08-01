import { bgCyan, bgGreenBright, black, blueBright, bold, gray, greenBright, magenta, red, white, yellow } from "ansis";
import { inspect as nodeInspect } from "node:util";

export namespace log {
  /**
   * Interface for call site information.
   */
  type CallSiteInfo = {
    function: string | null;
    script: string | null;
    line: number | null;
    column: number | null;
    str: () => string;
  };

  /**
   * Parses a stack trace line to extract location information.
   *
   * @param line - Stack trace line to parse
   * @returns Parsed location information or null if parsing fails
   */
  const parseStackLine = (line: string): CallSiteInfo | null => {
    const match = line.match(/at (?:(.+?) \()?(.+?):(\d+):(\d+)\)?$/);

    if (!match) return null;

    const [, functionName, filePath, lineStr, columnStr] = match;
    const lineNumber = lineStr ? parseInt(lineStr, 10) : null;
    const columnNumber = columnStr ? parseInt(columnStr, 10) : null;

    // Extract relative path from the full file path
    const scriptPath = filePath?.includes("notion-sync/")
      ? filePath.split("notion-sync/")[1]
      : filePath?.replace("file://", "");

    return {
      function: functionName?.trim() || null,
      script: scriptPath || null,
      line: lineNumber,
      column: columnNumber,
      str: () => {
        // Get current working directory and make path relative to it
        const cwd = process.cwd();
        let relativePath = scriptPath;

        if (scriptPath && scriptPath.startsWith(cwd)) {
          relativePath = scriptPath.substring(cwd.length + 1); // +1 to remove leading slash
        } else if (scriptPath) {
          // Fallback: try to extract relative path from common patterns
          const patterns = ["/workspace/", "/packages/", "/src/"];
          for (const pattern of patterns) {
            const index = scriptPath.indexOf(pattern);
            if (index !== -1) {
              relativePath = scriptPath.substring(index + 1);
              break;
            }
          }
        }

        return `${magenta(functionName?.replace("async", "").trim() || "0")} ${gray(
          relativePath || scriptPath || "unknown"
        )}${black(":" + lineNumber)}`;
      }
    };
  };

  /**
   * Gets the caller location information from the call stack using Error stack traces.
   * This approach works better with source maps than getCallSites().
   *
   * @param skipFrames - Number of stack frames to skip (default: 3)
   * @returns Formatted location string
   */
  const loc = (skipFrames = 2): string => {
    // Create an error to get the stack trace
    const error = new Error();
    const stack = error.stack;

    if (!stack) {
      return "unknown:0:0";
    }

    // Split stack into lines and skip the first line (Error message)
    const stackLines = stack.split("\n").slice(1);

    // Skip internal frames (Error creation, loc function, debug/info/etc function)
    const relevantLines = stackLines.slice(skipFrames);

    // Find the first line that's in our source code and not in log.ts
    for (const line of relevantLines) {
      const parsed = parseStackLine(line);
      if (parsed && parsed.script && parsed.script.includes("src/") && !parsed.script.includes("log.ts")) {
        // console.log(parsed.str());
        return parsed.str();
      }
    }

    return "unknown:0:0";
  };

  const d = (): string => {
    const date = new Date().toLocaleString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
      fractionalSecondDigits: 3,
      formatMatcher: "best fit"
    });
    return gray(date);
  };

  const level = (): number => {
    if (process.env.LOG_LEVEL === "debug") {
      return 3;
    } else if (process.env.LOG_LEVEL === "info") {
      return 2;
    } else if (process.env.LOG_LEVEL === "error") {
      return 1;
    } else {
      return 0;
    }
  };

  export namespace debugging {
    /**
     * Inspects and logs debugging information with call site details.
     *
     * @param label - Label for the debug output
     * @param args - Arguments to inspect
     */
    export const inspect = (label: string, args: any) => {
      if (level() >= 3) {
        console.log(`${d()} 🐛 ${bgGreenBright(white(label))} ${loc()}`);
        console.log(nodeInspect(args, { depth: 4, colors: true, sorted: true }));
      }
    };
  }

  /**
   * Logs an informational message with timestamp and location.
   *
   * @param message - The message to log
   * @param args - Optional arguments to inspect
   */
  export const info = (message: string, args?: any) => {
    if (level() >= 2) {
      console.log(`${d()} ℹ️  ${blueBright(message)} ${loc()}`);
      if (args) {
        console.log(nodeInspect(args, { depth: null, colors: true, sorted: true }));
      }
    }
  };

  /**
   * Logs a debug message with timestamp and location.
   *
   * @param message - The message to log
   * @param args - Arguments to inspect
   */
  export const debug = (message: string, args?: any) => {
    if (level() >= 3) {
      console.log(bgCyan(`${d()} 🐛 ${bold(message)} ${loc()}`));
      console.log(nodeInspect(args, { depth: 4, colors: true, sorted: true }));
    }
  };

  /**
   * Logs a success message with timestamp and location.
   *
   * @param message - The message to log
   * @param args - Optional arguments to inspect
   */
  export const success = (message: string, args?: any) => {
    if (level() >= 2) {
      console.log(`${d()} ✅ ${greenBright(message)} ${loc()}`);
      if (args) {
        console.log(nodeInspect(args, { depth: null, colors: true, sorted: true }));
      }
    }
  };

  /**
   * Logs a warning message with timestamp and location.
   *
   * @param message - The message to log
   * @param args - Optional arguments to inspect
   */
  export const warning = (message: string, args?: any) => {
    if (level() >= 2) {
      console.log(`${d()} ⚠️ ${yellow(message)} ${loc()}`);
      if (args) {
        console.log(nodeInspect(args, { depth: null, colors: true, sorted: true }));
      }
    }
  };

  /**
   * Logs an error message with timestamp and location.
   *
   * @param message - The message to log
   * @param args - Optional arguments to inspect
   */
  export const error = (message: string, args?: any) => {
    if (level() >= 1) {
      console.log(`${d()} ❌ ${red(message)} ${loc()}`);
      if (args) {
        console.log(nodeInspect(args, { depth: null, colors: true, sorted: true }));
      }
    }
  };

  /**
   * Logs a fatal error message with timestamp and location, then exits the process.
   *
   * @param message - The message to log
   * @param args - Optional arguments to inspect
   */
  export const fatal = (message: string, args?: any) => {
    console.log(`${d()} ☠️ ${red(message)} ${loc()}`);
    if (args) {
      console.log(nodeInspect(args, { depth: null, colors: true, sorted: true }));
    }
    process.exit(1);
  };
}
