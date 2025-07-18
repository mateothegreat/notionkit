import type { NamingConfig } from "./naming";
import { namingRegistry } from "./naming";

/**
 * Transform object properties from Notion API format to target naming convention.
 */
export function transformFromNotion<T extends Record<string, any>>(obj: T, config: NamingConfig): any {
  const mapping = namingRegistry.getMapping(config.strategy);
  if (!mapping) {
    throw new Error(`Unknown naming strategy: ${config.strategy}`);
  }

  return transformObject(obj, mapping.toTarget, config);
}

/**
 * Transform object properties from target naming convention to Notion API format.
 */
export function transformToNotion<T extends Record<string, any>>(obj: T, config: NamingConfig): any {
  const mapping = namingRegistry.getMapping(config.strategy);
  if (!mapping) {
    throw new Error(`Unknown naming strategy: ${config.strategy}`);
  }

  return transformObject(obj, mapping.toNotion, config);
}

/**
 * Transform object properties using a transformer function.
 */
function transformObject<T extends Record<string, any>>(
  obj: T,
  transformer: (key: string) => string,
  config: NamingConfig
): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => transformObject(item, transformer, config));
  }

  if (typeof obj !== "object") {
    return obj;
  }

  const result: any = {};

  for (const [key, value] of Object.entries(obj)) {
    // Skip excluded properties
    if (config.excludeProperties?.includes(key)) {
      result[key] = value;
      continue;
    }

    // Use custom mapping if available
    let transformedKey = config.customMappings?.[key] ?? transformer(key);

    // Preserve unknown keys if configured
    if (config.preserveUnknown && transformedKey === key) {
      transformedKey = key;
    }

    // Recursively transform nested objects
    if (value && typeof value === "object") {
      result[transformedKey] = transformObject(value, transformer, config);
    } else {
      result[transformedKey] = value;
    }
  }

  return result;
}

/**
 * Type utility to transform property names at the type level.
 */
export type TransformKeys<T, Strategy extends string> = Strategy extends "camelCase"
  ? CamelCaseKeys<T>
  : Strategy extends "snake_case"
    ? T
    : Strategy extends "kebab-case"
      ? KebabCaseKeys<T>
      : Strategy extends "PascalCase"
        ? PascalCaseKeys<T>
        : Strategy extends "SCREAMING_SNAKE_CASE"
          ? UpperCaseKeys<T>
          : T;

/**
 * Convert object keys to camelCase at the type level.
 */
type CamelCaseKeys<T> = {
  [K in keyof T as K extends string ? CamelCase<K> : K]: T[K] extends Record<string, any> ? CamelCaseKeys<T[K]> : T[K];
};

/**
 * Convert object keys to kebab-case at the type level.
 */
type KebabCaseKeys<T> = {
  [K in keyof T as K extends string ? KebabCase<K> : K]: T[K] extends Record<string, any> ? KebabCaseKeys<T[K]> : T[K];
};

/**
 * Convert object keys to PascalCase at the type level.
 */
type PascalCaseKeys<T> = {
  [K in keyof T as K extends string ? PascalCase<K> : K]: T[K] extends Record<string, any>
    ? PascalCaseKeys<T[K]>
    : T[K];
};

/**
 * Convert object keys to SCREAMING_SNAKE_CASE at the type level.
 */
type UpperCaseKeys<T> = {
  [K in keyof T as K extends string ? Uppercase<K> : K]: T[K] extends Record<string, any> ? UpperCaseKeys<T[K]> : T[K];
};

/**
 * Convert string to camelCase at the type level.
 */
type CamelCase<S extends string> = S extends `${infer P1}_${infer P2}${infer P3}`
  ? `${P1}${Uppercase<P2>}${CamelCase<P3>}`
  : S;

/**
 * Convert string to kebab-case at the type level.
 */
type KebabCase<S extends string> = S extends `${infer P1}_${infer P2}` ? `${P1}-${KebabCase<P2>}` : S;

/**
 * Convert string to PascalCase at the type level.
 */
type PascalCase<S extends string> = S extends `${infer P1}_${infer P2}`
  ? `${Capitalize<P1>}${PascalCase<P2>}`
  : Capitalize<S>;
