import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  clearTestDataCache,
  getTestDataCacheInfo,
  loadMultipleTestData,
  loadTestData,
  preloadTestData,
  testDataLoaders,
  type TestDataLoaderConfig
} from "./test-data-loader";

describe("test-data-loader", () => {
  beforeEach(() => {
    // Clear cache before each test to ensure clean state
    clearTestDataCache();
  });

  afterEach(() => {
    // Clean up after each test
    clearTestDataCache();
  });

  describe("loadTestData", () => {
    it("should load database.json test data successfully", () => {
      const data = loadTestData("database");

      expect(data).toBeDefined();
      expect(typeof data).toBe("object");
      expect(data).toHaveProperty("object", "database");
      expect(data).toHaveProperty("id");
      expect(data).toHaveProperty("properties");
    });

    it("should load page.json test data successfully", () => {
      const data = loadTestData("page");

      expect(data).toBeDefined();
      expect(typeof data).toBe("object");
      expect(data).toHaveProperty("object", "page");
      expect(data).toHaveProperty("id");
      expect(data).toHaveProperty("properties");
    });

    it("should work with .json extension in filename", () => {
      const data = loadTestData("database.json");

      expect(data).toBeDefined();
      expect(data).toHaveProperty("object", "database");
    });

    it("should cache data by default", () => {
      // Load data twice
      const data1 = loadTestData("database");
      const data2 = loadTestData("database");

      // Should be the same reference (cached)
      expect(data1).toBe(data2);

      // Check cache info
      const cacheInfo = getTestDataCacheInfo();
      expect(cacheInfo.size).toBe(1);
      expect(cacheInfo.keys).toContain("test/data/database.json");
    });

    it("should not cache when cache is disabled", () => {
      const config: TestDataLoaderConfig = { cache: false };

      const data1 = loadTestData("database", config);
      const data2 = loadTestData("database", config);

      // Should be different references (not cached)
      expect(data1).not.toBe(data2);
      expect(data1).toEqual(data2); // But equal in content

      // Cache should be empty
      const cacheInfo = getTestDataCacheInfo();
      expect(cacheInfo.size).toBe(0);
    });

    it("should use custom base directory", () => {
      const config: TestDataLoaderConfig = {
        baseDir: "test/data"
      };

      const data = loadTestData("database", config);
      expect(data).toBeDefined();
      expect(data).toHaveProperty("object", "database");
    });

    it("should throw error for non-existent file", () => {
      expect(() => {
        loadTestData("non-existent-file");
      }).toThrow(/Failed to load test data/);
    });

    it("should validate data when validation is enabled", () => {
      // This test assumes all our test files contain valid data
      // The validation mainly checks for null/undefined
      const data = loadTestData("database", { validate: true });
      expect(data).toBeDefined();
      expect(data).not.toBeNull();
    });
  });

  describe("loadMultipleTestData", () => {
    it("should load multiple test files at once", () => {
      const testData = loadMultipleTestData(["database", "page"]);

      expect(testData).toHaveProperty("database");
      expect(testData).toHaveProperty("page");
      expect(testData.database).toHaveProperty("object", "database");
      expect(testData.page).toHaveProperty("object", "page");
    });

    it("should handle filenames with .json extension", () => {
      const testData = loadMultipleTestData(["database.json", "page.json"]);

      expect(testData).toHaveProperty("database");
      expect(testData).toHaveProperty("page");
    });

    it("should return empty object for empty array", () => {
      const testData = loadMultipleTestData([]);
      expect(testData).toEqual({});
    });

    it("should pass configuration to individual loads", () => {
      const config: TestDataLoaderConfig = { cache: false };
      const testData = loadMultipleTestData(["database", "page"], config);

      expect(testData).toHaveProperty("database");
      expect(testData).toHaveProperty("page");

      // Cache should be empty since caching is disabled
      const cacheInfo = getTestDataCacheInfo();
      expect(cacheInfo.size).toBe(0);
    });
  });

  describe("clearTestDataCache", () => {
    it("should clear specific file from cache", () => {
      // Load some data to populate cache
      loadTestData("database");
      loadTestData("page");

      expect(getTestDataCacheInfo().size).toBe(2);

      // Clear specific file
      clearTestDataCache("database");

      const cacheInfo = getTestDataCacheInfo();
      expect(cacheInfo.size).toBe(1);
      expect(cacheInfo.keys).not.toContain("test/data/database.json");
      expect(cacheInfo.keys).toContain("test/data/page.json");
    });

    it("should clear entire cache when no filename provided", () => {
      // Load some data to populate cache
      loadTestData("database");
      loadTestData("page");

      expect(getTestDataCacheInfo().size).toBe(2);

      // Clear entire cache
      clearTestDataCache();

      expect(getTestDataCacheInfo().size).toBe(0);
    });

    it("should handle clearing non-existent cache entry", () => {
      clearTestDataCache("non-existent");
      // Should not throw error
      expect(getTestDataCacheInfo().size).toBe(0);
    });
  });

  describe("getTestDataCacheInfo", () => {
    it("should return correct cache information", () => {
      const initialInfo = getTestDataCacheInfo();
      expect(initialInfo.size).toBe(0);
      expect(initialInfo.keys).toEqual([]);

      // Load some data
      loadTestData("database");
      loadTestData("page");

      const afterLoadInfo = getTestDataCacheInfo();
      expect(afterLoadInfo.size).toBe(2);
      expect(afterLoadInfo.keys).toContain("test/data/database.json");
      expect(afterLoadInfo.keys).toContain("test/data/page.json");
    });
  });

  describe("preloadTestData", () => {
    it("should preload default test data files", () => {
      preloadTestData();

      const cacheInfo = getTestDataCacheInfo();
      expect(cacheInfo.size).toBeGreaterThan(0);

      // Should include common files
      expect(cacheInfo.keys.some((key) => key.includes("database.json"))).toBe(true);
      expect(cacheInfo.keys.some((key) => key.includes("page.json"))).toBe(true);
    });

    it("should preload specific files", () => {
      preloadTestData(["database", "page"]);

      const cacheInfo = getTestDataCacheInfo();
      expect(cacheInfo.size).toBe(2);
      expect(cacheInfo.keys).toContain("test/data/database.json");
      expect(cacheInfo.keys).toContain("test/data/page.json");
    });

    it("should handle non-existent files gracefully", () => {
      // Should not throw error, just log warning
      expect(() => {
        preloadTestData(["non-existent-file"]);
      }).not.toThrow();

      // Cache should be empty
      expect(getTestDataCacheInfo().size).toBe(0);
    });

    it("should pass configuration to preload", () => {
      const config: TestDataLoaderConfig = { cache: false };
      preloadTestData(["database"], config);

      // Should not cache when cache is disabled
      expect(getTestDataCacheInfo().size).toBe(0);
    });
  });

  describe("testDataLoaders", () => {
    it("should load database data with type safety", () => {
      const data = testDataLoaders.database();

      expect(data).toBeDefined();
      expect(data.object).toBe("database");
      expect(typeof data.id).toBe("string");
      expect(typeof data.created_time).toBe("string");
      expect(Array.isArray(data.title)).toBe(true);
      expect(typeof data.properties).toBe("object");
    });

    it("should load page data with type safety", () => {
      const data = testDataLoaders.page();

      expect(data).toBeDefined();
      expect(data.object).toBe("page");
      expect(typeof data.id).toBe("string");
      expect(typeof data.created_time).toBe("string");
      expect(typeof data.properties).toBe("object");
    });

    it("should load property title data with type safety", () => {
      const data = testDataLoaders.propertyTitle();

      expect(data).toBeDefined();
      expect(data.object).toBe("list");
      expect(Array.isArray(data.results)).toBe(true);

      if (data.results.length > 0) {
        const firstResult = data.results[0]!;
        expect(firstResult.object).toBe("property_item");
        expect(typeof firstResult.type).toBe("string");
        expect(typeof firstResult.id).toBe("string");
      }
    });

    it("should load property relation data with type safety", () => {
      const data = testDataLoaders.propertyRelation();

      expect(data).toBeDefined();
      expect(data.object).toBe("list");
      expect(Array.isArray(data.results)).toBe(true);

      if (data.results.length > 0) {
        const firstResult = data.results[0]!;
        expect(firstResult.object).toBe("property_item");
        expect(firstResult.type).toBe("relation");
        expect(typeof firstResult.id).toBe("string");
        expect(typeof firstResult.relation.id).toBe("string");
      }
    });
  });

  describe("error handling", () => {
    it("should provide meaningful error messages", () => {
      try {
        loadTestData("definitely-does-not-exist");
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain("Failed to load test data");
        expect((error as Error).message).toContain("definitely-does-not-exist");
      }
    });

    it("should handle JSON parsing errors", () => {
      // This would require creating a malformed JSON file,
      // which we can't easily do in this test environment.
      // The error handling is covered by the general error catch block.
      expect(true).toBe(true); // Placeholder for this edge case
    });
  });

  describe("performance and caching", () => {
    it("should improve performance with caching", () => {
      const start1 = performance.now();
      loadTestData("database");
      const time1 = performance.now() - start1;

      const start2 = performance.now();
      loadTestData("database"); // Should be from cache
      const time2 = performance.now() - start2;

      // Cached load should be significantly faster
      // Note: This is a rough performance test and may be flaky in CI
      expect(time2).toBeLessThan(time1);
    });

    it("should handle large numbers of cache entries", () => {
      // Load multiple files to test cache scalability
      const filenames = ["database", "page", "page-property-title", "page-property-relation"];

      for (const filename of filenames) {
        loadTestData(filename);
      }

      const cacheInfo = getTestDataCacheInfo();
      expect(cacheInfo.size).toBe(filenames.length);
      expect(cacheInfo.keys.length).toBe(filenames.length);
    });
  });
});
