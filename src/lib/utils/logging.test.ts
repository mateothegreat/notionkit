import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { log } from "./logging";

// Mock console methods
const originalConsoleLog = console.log;
const originalProcessExit = process.exit;

describe("logging utility", () => {
  beforeEach(() => {
    console.log = vi.fn();
    process.exit = vi.fn() as any;
  });

  afterEach(() => {
    console.log = originalConsoleLog;
    process.exit = originalProcessExit;
  });

  describe("log.info", () => {
    it("should log informational messages", () => {
      log.info("Test info message");
      expect(console.log).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Test info message"));
    });

    it("should log informational messages with args", () => {
      const testArgs = { key: "value" };
      log.info("Test info message", testArgs);
      expect(console.log).toHaveBeenCalledTimes(2);
    });
  });

  describe("log.debug", () => {
    it("should log debug messages", () => {
      log.debug("Test debug message");
      expect(console.log).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Test debug message"));
    });

    it("should log debug messages with args", () => {
      const testArgs = { debug: true };
      log.debug("Test debug message", testArgs);
      expect(console.log).toHaveBeenCalled();
    });
  });

  describe("log.trace", () => {
    it("should log trace messages", () => {
      const testArgs = { trace: "data" };
      log.trace("Test trace message", testArgs);
      expect(console.log).toHaveBeenCalledTimes(2);
    });
  });

  describe("log.success", () => {
    it("should log success messages", () => {
      log.success("Test success message");
      expect(console.log).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Test success message"));
    });

    it("should log success messages with args", () => {
      const testArgs = { success: true };
      log.success("Test success message", testArgs);
      expect(console.log).toHaveBeenCalledTimes(2);
    });
  });

  describe("log.warning", () => {
    it("should log warning messages", () => {
      log.warning("Test warning message");
      expect(console.log).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Test warning message"));
    });

    it("should log warning messages with args", () => {
      const testArgs = { warning: true };
      log.warning("Test warning message", testArgs);
      expect(console.log).toHaveBeenCalledTimes(2);
    });
  });

  describe("log.error", () => {
    it("should log error messages", () => {
      log.error("Test error message");
      expect(console.log).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Test error message"));
    });

    it("should log error messages with args", () => {
      const testArgs = { error: true };
      log.error("Test error message", testArgs);
      expect(console.log).toHaveBeenCalledTimes(2);
    });
  });

  describe("log.fatal", () => {
    it("should log fatal messages and exit", () => {
      log.fatal("Test fatal message");
      expect(console.log).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Test fatal message"));
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it("should log fatal messages with args and exit", () => {
      const testArgs = { fatal: true };
      log.fatal("Test fatal message", testArgs);
      expect(console.log).toHaveBeenCalledTimes(2);
      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });

  describe("log.debugging.inspect", () => {
    it("should inspect and log debugging information", () => {
      const testData = { test: "data", nested: { value: 123 } };
      log.debugging.inspect("Test Debug", testData);
      expect(console.log).toHaveBeenCalledTimes(2);
    });
  });

  describe("internal functions", () => {
    it("should handle stack trace parsing", () => {
      // Create a simple test to verify the internal functions work
      log.info("Stack trace test");
      expect(console.log).toHaveBeenCalled();

      // The location info should be included in the output
      const calls = (console.log as any).mock.calls;
      expect(calls[0][0]).toContain("Stack trace test");
    });

    it("should handle date formatting", () => {
      log.info("Date test");
      expect(console.log).toHaveBeenCalled();

      // Should include timestamp
      const calls = (console.log as any).mock.calls;
      expect(calls[0][0]).toMatch(/\d{2}:\d{2}:\d{2}/);
    });

    it("should handle missing stack trace", () => {
      // Mock Error to return no stack
      const originalError = Error;
      global.Error = class extends Error {
        constructor(message?: string) {
          super(message);
          this.stack = undefined;
        }
      } as any;

      log.info("No stack test");
      expect(console.log).toHaveBeenCalled();

      // Restore original Error
      global.Error = originalError;
    });
  });
});
