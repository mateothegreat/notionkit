import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

/**
 * Interface for test data loader configuration.
 */
export interface TestDataLoaderConfig {
  /**
   * Base directory containing test data files.
   * Defaults to 'test/data' relative to the project root.
   */
  baseDir?: string;

  /**
   * Whether to cache loaded data to avoid repeated file reads.
   * Defaults to true for performance.
   */
  cache?: boolean;

  /**
   * Whether to validate JSON structure after loading.
   * Defaults to true for safety.
   */
  validate?: boolean;
}

/**
 * Cache for loaded test data to improve performance.
 */
const dataCache = new Map<string, unknown>();

/**
 * Get the project root directory for resolving test data paths.
 */
function getProjectRoot(): string {
  // Start from current file location and walk up to find package.json
  let currentDir = dirname(fileURLToPath(import.meta.url));

  while (currentDir !== "/") {
    try {
      readFileSync(join(currentDir, "package.json"));
      return currentDir;
    } catch {
      currentDir = dirname(currentDir);
    }
  }

  // Fallback to current working directory
  return process.cwd();
}

/**
 * Load JSON test data from a file in the test/data directory.
 *
 * @param filename - Name of the JSON file (with or without .json extension)
 * @param config - Optional configuration for the loader
 * @returns Parsed JSON data
 *
 * @example
 * ```typescript
 * // Load database.json test data
 * const databaseData = loadTestData('database');
 *
 * // Load with custom configuration
 * const pageData = loadTestData('page', {
 *   baseDir: 'custom/test/data',
 *   cache: false
 * });
 * ```
 */
export function loadTestData<T = unknown>(filename: string, config: TestDataLoaderConfig = {}): T {
  const { baseDir = "test/data", cache = true, validate = true } = config;

  // Ensure filename has .json extension
  const jsonFilename = filename.endsWith(".json") ? filename : `${filename}.json`;

  // Create cache key
  const cacheKey = `${baseDir}/${jsonFilename}`;

  // Check cache first if enabled
  if (cache && dataCache.has(cacheKey)) {
    return dataCache.get(cacheKey) as T;
  }

  try {
    // Resolve full file path
    const projectRoot = getProjectRoot();
    const filePath = join(projectRoot, baseDir, jsonFilename);

    // Read and parse JSON file
    const fileContent = readFileSync(filePath, "utf-8");
    const data = JSON.parse(fileContent) as T;

    // Basic validation
    if (validate && (data === null || data === undefined)) {
      throw new Error(`Invalid JSON data in ${jsonFilename}: data is null or undefined`);
    }

    // Cache the result if enabled
    if (cache) {
      dataCache.set(cacheKey, data);
    }

    return data;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to load test data from ${jsonFilename}: ${errorMessage}`);
  }
}

/**
 * Load multiple test data files at once.
 *
 * @param filenames - Array of filenames to load
 * @param config - Optional configuration for the loader
 * @returns Object with filename as key and parsed data as value
 *
 * @example
 * ```typescript
 * const testData = loadMultipleTestData(['database', 'page', 'page-property-title']);
 * console.log(testData.database, testData.page, testData['page-property-title']);
 * ```
 */
export function loadMultipleTestData<T = unknown>(
  filenames: string[],
  config: TestDataLoaderConfig = {}
): Record<string, T> {
  const result: Record<string, T> = {};

  for (const filename of filenames) {
    const key = filename.replace(".json", "");
    result[key] = loadTestData<T>(filename, config);
  }

  return result;
}

/**
 * Clear the test data cache. Useful for tests that modify data
 * or when you want to ensure fresh data is loaded.
 *
 * @param filename - Optional specific filename to clear from cache.
 *                   If not provided, clears entire cache.
 */
export function clearTestDataCache(filename?: string): void {
  if (filename) {
    const jsonFilename = filename.endsWith(".json") ? filename : `${filename}.json`;
    dataCache.delete(`test/data/${jsonFilename}`);
  } else {
    dataCache.clear();
  }
}

/**
 * Get information about the current test data cache.
 * Useful for debugging and monitoring cache performance.
 */
export function getTestDataCacheInfo(): {
  size: number;
  keys: string[];
} {
  return {
    size: dataCache.size,
    keys: Array.from(dataCache.keys())
  };
}

/**
 * Preload commonly used test data files to improve test performance.
 * Call this in test setup to warm the cache.
 *
 * @param filenames - Array of filenames to preload
 * @param config - Optional configuration for the loader
 */
export function preloadTestData(
  filenames: string[] = ["database", "page", "page-property-title", "page-property-relation"],
  config: TestDataLoaderConfig = {}
): void {
  for (const filename of filenames) {
    try {
      loadTestData(filename, config);
    } catch (error) {
      console.warn(`Failed to preload test data ${filename}:`, error);
    }
  }
}

/**
 * Type-safe test data loaders for common Notion API objects.
 * These provide better TypeScript support and validation.
 */
export const testDataLoaders = {
  /**
   * Load database object test data with type safety.
   */
  database: () =>
    loadTestData<{
      object: "database";
      id: string;
      created_time: string;
      last_edited_time: string;
      title: Array<{
        type: "text";
        text: { content: string; link: null };
        annotations: Record<string, boolean | string>;
        plain_text: string;
        href: null;
      }>;
      properties: Record<
        string,
        {
          id: string;
          name: string;
          type: string;
          [key: string]: unknown;
        }
      >;
      [key: string]: unknown;
    }>("database"),

  /**
   * Load page object test data with type safety.
   */
  page: () =>
    loadTestData<{
      object: "page";
      id: string;
      created_time: string;
      last_edited_time: string;
      properties: Record<
        string,
        {
          id: string;
          type: string;
          [key: string]: unknown;
        }
      >;
      [key: string]: unknown;
    }>("page"),

  /**
   * Load property item test data with type safety.
   */
  propertyTitle: () =>
    loadTestData<{
      object: "list";
      results: Array<{
        object: "property_item";
        type: string;
        id: string;
        [key: string]: unknown;
      }>;
      [key: string]: unknown;
    }>("page-property-title"),

  /**
   * Load relation property test data with type safety.
   */
  propertyRelation: () =>
    loadTestData<{
      object: "list";
      results: Array<{
        object: "property_item";
        type: "relation";
        id: string;
        relation: { id: string };
      }>;
      [key: string]: unknown;
    }>("page-property-relation")
} as const;
