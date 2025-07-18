/**
 * Supported naming conventions for property transformation.
 */
export type NamingStrategy = "camelCase" | "snake_case" | "kebab-case" | "PascalCase" | "SCREAMING_SNAKE_CASE";

/**
 * Configuration for property naming transformation.
 */
export interface NamingConfig {
  /** The naming strategy to use for API responses */
  strategy: NamingStrategy;
  /** Custom property mappings that override the default strategy */
  customMappings?: Record<string, string>;
  /** Whether to preserve original property names for unknown mappings */
  preserveUnknown?: boolean;
  /** Properties to always exclude from transformation */
  excludeProperties?: string[];
}

/**
 * Bidirectional property mapping for a specific naming strategy.
 */
export interface PropertyMapping {
  /** Transform from Notion API format to target format */
  toTarget: (notionKey: string) => string;
  /** Transform from target format to Notion API format */
  toNotion: (targetKey: string) => string;
  /** Get all known mappings for this strategy */
  getMappings: () => Record<string, string>;
}

/**
 * Registry of property transformers for different naming strategies.
 */
export class NamingRegistry {
  private strategies = new Map<NamingStrategy, PropertyMapping>();
  private customMappings = new Map<string, Record<string, string>>();

  /**
   * Register a naming strategy with its property mapping.
   */
  register(strategy: NamingStrategy, mapping: PropertyMapping): void {
    this.strategies.set(strategy, mapping);
  }

  /**
   * Get property mapping for a specific strategy.
   */
  getMapping(strategy: NamingStrategy): PropertyMapping | undefined {
    return this.strategies.get(strategy);
  }

  /**
   * Register custom property mappings for a specific context.
   */
  registerCustomMappings(context: string, mappings: Record<string, string>): void {
    this.customMappings.set(context, mappings);
  }

  /**
   * Get custom mappings for a specific context.
   */
  getCustomMappings(context: string): Record<string, string> | undefined {
    return this.customMappings.get(context);
  }
}

/**
 * Convert string to camelCase.
 */
export function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Convert string to snake_case.
 */
export function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

/**
 * Convert string to kebab-case.
 */
export function toKebabCase(str: string): string {
  return str
    .replace(/_/g, "-") // Convert underscores to hyphens
    .replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`); // Convert camelCase to kebab-case
}

/**
 * Convert string to PascalCase.
 */
export function toPascalCase(str: string): string {
  return str.replace(/(?:^|_)([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Convert string to SCREAMING_SNAKE_CASE.
 */
export function toScreamingSnakeCase(str: string): string {
  return toSnakeCase(str).toUpperCase();
}

/**
 * Create a property mapping for a specific naming strategy.
 */
export function createPropertyMapping(strategy: NamingStrategy): PropertyMapping {
  const transformer = getTransformer(strategy);
  const reverseTransformer = getReverseTransformer(strategy);

  return {
    toTarget: transformer,
    toNotion: reverseTransformer,
    getMappings: () => {
      // This would typically be populated from a comprehensive mapping table
      // For now, we'll return common Notion properties
      const commonNotionProperties = [
        "created_time",
        "created_by",
        "last_edited_time",
        "last_edited_by",
        "page_id",
        "database_id",
        "block_id",
        "user_id",
        "workspace_id",
        "rich_text",
        "plain_text",
        "has_children",
        "is_inline",
        "start_cursor",
        "next_cursor",
        "has_more",
        "page_size",
        "file_upload_id"
      ];

      const mappings: Record<string, string> = {};
      commonNotionProperties.forEach((prop) => {
        mappings[prop] = transformer(prop);
      });

      return mappings;
    }
  };
}

/**
 * Get the transformer function for a naming strategy.
 */
function getTransformer(strategy: NamingStrategy): (key: string) => string {
  switch (strategy) {
    case "camelCase":
      return toCamelCase;
    case "snake_case":
      return (key) => key; // Already in snake_case
    case "kebab-case":
      return toKebabCase;
    case "PascalCase":
      return toPascalCase;
    case "SCREAMING_SNAKE_CASE":
      return toScreamingSnakeCase;
    default:
      return (key) => key;
  }
}

/**
 * Get the reverse transformer function for a naming strategy.
 */
function getReverseTransformer(strategy: NamingStrategy): (key: string) => string {
  switch (strategy) {
    case "camelCase":
      return toSnakeCase;
    case "snake_case":
      return (key) => key; // Already in snake_case
    case "kebab-case":
      return (key) => key.replace(/-/g, "_");
    case "PascalCase":
      return toSnakeCase;
    case "SCREAMING_SNAKE_CASE":
      return (key) => key.toLowerCase();
    default:
      return (key) => key;
  }
}

/**
 * Global naming registry instance.
 */
export const namingRegistry = new NamingRegistry();

// Register default strategies
namingRegistry.register("camelCase", createPropertyMapping("camelCase"));
namingRegistry.register("snake_case", createPropertyMapping("snake_case"));
namingRegistry.register("kebab-case", createPropertyMapping("kebab-case"));
namingRegistry.register("PascalCase", createPropertyMapping("PascalCase"));
namingRegistry.register("SCREAMING_SNAKE_CASE", createPropertyMapping("SCREAMING_SNAKE_CASE"));
