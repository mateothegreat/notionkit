import { type } from "arktype";

export const id = type("/^(.{8})(.{4})(.{4})(.{4})(.{12})$/");
export const uuid = type("/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/");
export const shortId = type("/^[0-9A-Za-f%]{8}$/");
export const date = type("/^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(\\.\\d{3})?Z?$/");
export const color = type.enumerated(
  '"default" | "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red" | "gray_background" | "brown_background" | "orange_background" | "yellow_background" | "green_background" | "blue_background" | "purple_background" | "pink_background" | "red_background"'
);

/**
 * Common number format types used in financial contexts.
 */
export const numberFormatDefaults = type('"percent" | "dollar" | "canadian_dollar" | "euro" | "pound" | "yen"');

/**
 * Additional currency format types for emerging markets.
 */
export const numberFormatEmerging = type('"ruble" | "rupee" | "won" | "yuan" | "real"');

/**
 * European currency format types.
 */
export const numberFormatEuropean = type(
  '"lira" | "franc" | "krona" | "norwegian_krone" | "danish_krone" | "zloty" | "forint" | "koruna" | "leu"'
);

/**
 * Asian currency format types.
 */
export const numberFormatAsian = type('"rupiah" | "hong_kong_dollar" | "new_taiwan_dollar" | "baht" | "ringgit"');

/**
 * Americas currency format types.
 */
export const numberFormatAmericas = type(
  '"mexican_peso" | "chilean_peso" | "philippine_peso" | "colombian_peso" | "argentine_peso" | "uruguayan_peso"'
);

/**
 * Oceania and other regional currency format types.
 */
export const numberFormatOceania = type('"new_zealand_dollar" | "rand" | "shekel" | "dirham" | "riyal"');

/**
 * Combined number format schema including all currency types.
 */
export const numberFormat = type([
  numberFormatDefaults,
  numberFormatEmerging,
  numberFormatEuropean,
  numberFormatAsian,
  numberFormatAmericas,
  numberFormatOceania
]);
