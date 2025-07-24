// import { scope } from "arktype";
// import {
//   annotationsSchema,
//   colorSchema,
//   coverSchema,
//   iconSchema,
//   idSchema,
//   isoDateSchema,
//   richTextItemSchema,
//   richTextSchema,
//   userSchema
// } from "./schemas";

// /**
//  * A scope for all query-related schemas, ensuring type safety and reusability.
//  * This scope defines all the necessary types for constructing and validating
//  * Notion API database queries and parsing their responses.
//  *
//  * It leverages other pre-defined schemas for common types like users, dates,
//  * and rich text, promoting a modular and maintainable type system.
//  */
// export const query = scope({
//   /**
//    * Defines a sort object for database queries, specifying a property to sort by
//    * and the direction of the sort.
//    */
//   databaseSort: {
//     property: "string",
//     direction: "'ascending' | 'descending'"
//   },
//   /**
//    * Defines a filter condition for checkbox properties.
//    */
//   checkboxFilter: {
//     "equals?": "boolean",
//     "does_not_equal?": "boolean"
//   },
//   /**
//    * Defines filter conditions for number properties, including comparisons and
//    * emptiness checks.
//    */
//   numberFilter: {
//     "equals?": "number",
//     "does_not_equal?": "number",
//     "greater_than?": "number",
//     "less_than?": "number",
//     "greater_than_or_equal_to?": "number",
//     "less_than_or_equal_to?": "number",
//     "is_empty?": "boolean",
//     "is_not_empty?": "boolean"
//   },
//   /**
//    * Defines filter conditions for text-based properties.
//    */
//   textFilter: {
//     "equals?": "string",
//     "does_not_equal?": "string",
//     "contains?": "string",
//     "does_not_contain?": "string",
//     "starts_with?": "string",
//     "ends_with?": "string",
//     "is_empty?": "boolean",
//     "is_not_empty?": "boolean"
//   },
//   /**
//    * Defines filter conditions for 'select' properties.
//    */
//   selectFilter: {
//     "equals?": "string",
//     "does_not_equal?": "string",
//     "is_empty?": "boolean",
//     "is_not_empty?": "boolean"
//   },
//   /**
//    * Defines filter conditions for 'multi_select' properties.
//    */
//   multiSelectFilter: {
//     "contains?": "string",
//     "does_not_contain?": "string",
//     "is_empty?": "boolean",
//     "is_not_empty?": "boolean"
//   },
//   /**
//    * Defines filter conditions for date properties, supporting various
//    * relative and absolute time comparisons.
//    */
//   dateFilter: {
//     "equals?": "isoDate",
//     "before?": "isoDate",
//     "after?": "isoDate",
//     "on_or_before?": "isoDate",
//     "on_or_after?": "isoDate",
//     "past_week?": "object",
//     "past_month?": "object",
//     "past_year?": "object",
//     "next_week?": "object",
//     "next_month?": "object",
//     "next_year?": "object",
//     "is_empty?": "boolean",
//     "is_not_empty?": "boolean"
//   },
//   /**
//    * Defines filter conditions for 'people' properties.
//    */
//   peopleFilter: {
//     "contains?": "string",
//     "does_not_contain?": "string",
//     "is_empty?": "boolean",
//     "is_not_empty?": "boolean"
//   },
//   /**
//    * Defines filter conditions for 'relation' properties.
//    */
//   relationFilter: {
//     "contains?": "string",
//     "does_not_contain?": "string",
//     "is_empty?": "boolean",
//     "is_not_empty?": "boolean"
//   },
//   /**
//    * Defines filter conditions for 'formula' properties, which can result
//    * in different data types.
//    */
//   formulaFilter: {
//     "string?": "textFilter",
//     "checkbox?": "checkboxFilter",
//     "number?": "numberFilter",
//     "date?": "dateFilter"
//   },
//   /**
//    * Defines filter conditions for 'rollup' properties.
//    */
//   rollupFilter: {
//     "any?": "object",
//     "every?": "object",
//     "none?": "object",
//     "date?": "dateFilter",
//     "number?": "numberFilter"
//   },
//   /**
//    * A comprehensive filter for a single property, dispatching to the
//    * appropriate filter type based on the property's type.
//    */
//   propertyFilter: {
//     property: "string",
//     "checkbox?": "checkboxFilter",
//     "number?": "numberFilter",
//     "rich_text?": "textFilter",
//     "title?": "textFilter",
//     "select?": "selectFilter",
//     "multi_select?": "multiSelectFilter",
//     "date?": "dateFilter",
//     "created_time?": "dateFilter",
//     "last_edited_time?": "dateFilter",
//     "people?": "peopleFilter",
//     "created_by?": "peopleFilter",
//     "last_edited_by?": "peopleFilter",
//     "relation?": "relationFilter",
//     "formula?": "formulaFilter",
//     "rollup?": "rollupFilter",
//     "url?": "textFilter",
//     "email?": "textFilter",
//     "phone_number?": "textFilter"
//   },
//   /**
//    * A compound filter that allows for nested 'and'/'or' conditions.
//    * This is part of the recursive database filter definition.
//    */
//   compoundFilter: {
//     "and?": "databaseFilter[]",
//     "or?": "databaseFilter[]"
//   },
//   /**
//    * A database filter can be a single property filter or a compound filter,
//    * allowing for complex queries.
//    */
//   databaseFilter: "propertyFilter & compoundFilter",
//   /**
//    * Defines the parameters for a database query, including filter, sorts,
//    * and pagination.
//    */
//   databaseQueryParameters: {
//     filter: "databaseFilter",
//     sorts: "databaseSort[]",
//     start_cursor: "string",
//     page_size: "number"
//   },
//   /**
//    * The schema for a database query request, where all parameters are optional.
//    */
//   databaseQuery: {
//     "filter?": "databaseFilter",
//     "sorts?": "databaseSort[]",
//     "start_cursor?": "string",
//     "page_size?": "number"
//   },
//   /**
//    * A reference to a Notion user object, imported from the common schemas.
//    */
//   user: userSchema,
//   /**
//    * A reference to the ISO date schema, imported for use in date-related fields.
//    */
//   isoDate: isoDateSchema,
//   /**
//    * Represents a relation object with an ID.
//    */
//   relation: {
//     id: "string"
//   },
//   /**
//    * Represents the value of a single property on a Notion page.
//    */
//   pageProperty: {
//     id: "string",
//     type: "string",
//     "title?": "richTextItem[]",
//     "rich_text?": "richTextItem[]",
//     "number?": "number",
//     "select?": {
//       id: "string",
//       name: "string",
//       color: "color"
//     },
//     "multi_select?": "object[]",
//     "date?": {
//       start: "isoDate",
//       "end?": "isoDate | null",
//       "time_zone?": "string | null"
//     },
//     "checkbox?": "boolean",
//     "url?": "string",
//     "email?": "string",
//     "phone_number?": "string",
//     "people?": "user[]",
//     "relation?": "relation[]",
//     "formula?": "object",
//     "rollup?": "object"
//   },
//   /**
//    * A reference to the rich text item schema.
//    */
//   richTextItem: richTextItemSchema,
//   /**
//    * A reference to the color schema.
//    */
//   color: colorSchema,
//   /**
//    * Represents a single page object in a Notion database.
//    */
//   pageObject: {
//     object: "'page'",
//     id: "id",
//     created_time: "isoDate",
//     last_edited_time: "isoDate",
//     created_by: "user",
//     last_edited_by: "user",
//     "cover?": "cover",
//     "icon?": "icon",
//     parent: "parent",
//     archived: "boolean",
//     properties: {
//       "[string]": "pageProperty"
//     },
//     url: "string"
//   },
//   /**
//    * Represents the response from a database query.
//    */
//   databaseQueryResponse: {
//     object: "'list'",
//     results: "pageObject[]",
//     next_cursor: "string | null",
//     has_more: "boolean",
//     type: "'page_or_database'",
//     page_or_database: "object"
//   },
//   // Import other schemas for use within this scope
//   id: idSchema,
//   annotations: annotationsSchema,
//   richText: richTextSchema,
//   mentionItem: "mentionItem",
//   parent: parentSchema,
//   cover: coverSchema,
//   icon: iconSchema
// }).export();

// export type DatabaseQuery = typeof query.databaseQuery.infer;
// export type DatabaseSort = typeof query.databaseSort.infer;
// export type PropertyFilter = typeof query.propertyFilter.infer;
// export type PageObject = typeof query.pageObject.infer;
// export type UserObject = typeof query.user.infer;
// export type DatabaseQueryResponse = typeof query.databaseQueryResponse.infer;
// export type DatabaseQueryParameters = typeof query.databaseQueryParameters.infer;
// export type DatabaseFilter = typeof query.databaseFilter.infer;
