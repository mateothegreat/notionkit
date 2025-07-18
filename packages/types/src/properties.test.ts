// import { describe, expect, it } from "vitest";
// import type { DatabaseTitleProperty } from "./databases";
// import {
//   validateDatabaseProperty,
//   validatePagePropertyValue,
//   type DatabaseProperty,
//   type PagePropertyValue
// } from "./properties";

// describe("Database Property Schema", () => {
//   it("should validate title property", () => {
//     const titleProperty: DatabaseTitleProperty = {
//       type: "title",
//       id: "prop_123",
//       name: "Title"
//     };

//     expect(validateDatabaseProperty(titleProperty)).toBe(true);
//     expect(getDatabasePropertyType(titleProperty.title)).toBe("title");
//     expect(isDatabasePropertyOfType(titleProperty as DatabaseProperty, "title")).toBe(true);
//   });

//   it("should validate rich text property", () => {
//     const richTextProperty = {
//       type: "rich_text",
//       rich_text: {}
//     };

//     expect(validateDatabaseProperty(richTextProperty)).toBe(true);
//     expect(getDatabasePropertyType(richTextProperty as DatabaseProperty)).toBe("rich_text");
//   });

//   it("should validate number property with format", () => {
//     const numberProperty = {
//       type: "number",
//       number: {
//         format: "dollar"
//       }
//     };

//     expect(validateDatabaseProperty(numberProperty)).toBe(true);
//     expect(getDatabasePropertyType(numberProperty as DatabaseProperty)).toBe("number");
//   });

//   it("should validate select property with options", () => {
//     const selectProperty = {
//       type: "select",
//       select: {
//         options: [
//           {
//             name: "Option 1",
//             id: "opt_1",
//             color: "blue"
//           },
//           {
//             name: "Option 2",
//             color: "red"
//           }
//         ]
//       }
//     };

//     expect(validateDatabaseProperty(selectProperty)).toBe(true);
//     expect(getDatabasePropertyType(selectProperty as DatabaseProperty)).toBe("select");
//   });

//   it("should validate multi-select property", () => {
//     const multiSelectProperty = {
//       type: "multi_select",
//       multi_select: {
//         options: [
//           {
//             name: "Tag 1",
//             color: "green"
//           },
//           {
//             name: "Tag 2",
//             color: "yellow"
//           }
//         ]
//       }
//     };

//     expect(validateDatabaseProperty(multiSelectProperty)).toBe(true);
//     expect(getDatabasePropertyType(multiSelectProperty as DatabaseProperty)).toBe("multi_select");
//   });

//   it("should validate status property", () => {
//     const statusProperty = {
//       type: "status",
//       status: {
//         options: [
//           {
//             name: "Not started",
//             color: "gray"
//           },
//           {
//             name: "In progress",
//             color: "yellow"
//           },
//           {
//             name: "Done",
//             color: "green"
//           }
//         ],
//         groups: [
//           {
//             name: "To-do",
//             color: "gray",
//             option_ids: ["opt_1"]
//           },
//           {
//             name: "In progress",
//             color: "yellow",
//             option_ids: ["opt_2"]
//           },
//           {
//             name: "Complete",
//             color: "green",
//             option_ids: ["opt_3"]
//           }
//         ]
//       }
//     };

//     expect(validateDatabaseProperty(statusProperty)).toBe(true);
//     expect(getDatabasePropertyType(statusProperty as DatabaseProperty)).toBe("status");
//   });

//   it("should validate date property", () => {
//     const dateProperty = {
//       type: "date",
//       date: {}
//     };

//     expect(validateDatabaseProperty(dateProperty)).toBe(true);
//     expect(getDatabasePropertyType(dateProperty as DatabaseProperty)).toBe("date");
//   });

//   it("should validate people property", () => {
//     const peopleProperty = {
//       type: "people",
//       people: {}
//     };

//     expect(validateDatabaseProperty(peopleProperty)).toBe(true);
//     expect(getDatabasePropertyType(peopleProperty as DatabaseProperty)).toBe("people");
//   });

//   it("should validate files property", () => {
//     const filesProperty = {
//       type: "files",
//       files: {}
//     };

//     expect(validateDatabaseProperty(filesProperty)).toBe(true);
//     expect(getDatabasePropertyType(filesProperty as DatabaseProperty)).toBe("files");
//   });

//   it("should validate checkbox property", () => {
//     const checkboxProperty = {
//       type: "checkbox",
//       checkbox: {}
//     };

//     expect(validateDatabaseProperty(checkboxProperty)).toBe(true);
//     expect(getDatabasePropertyType(checkboxProperty as DatabaseProperty)).toBe("checkbox");
//   });

//   it("should validate url property", () => {
//     const urlProperty = {
//       type: "url",
//       url: {}
//     };

//     expect(validateDatabaseProperty(urlProperty)).toBe(true);
//     expect(getDatabasePropertyType(urlProperty as DatabaseProperty)).toBe("url");
//   });

//   it("should validate email property", () => {
//     const emailProperty = {
//       type: "email",
//       email: {}
//     };

//     expect(validateDatabaseProperty(emailProperty)).toBe(true);
//     expect(getDatabasePropertyType(emailProperty as DatabaseProperty)).toBe("email");
//   });

//   it("should validate phone number property", () => {
//     const phoneProperty = {
//       type: "phone_number",
//       phone_number: {}
//     };

//     expect(validateDatabaseProperty(phoneProperty)).toBe(true);
//     expect(getDatabasePropertyType(phoneProperty as DatabaseProperty)).toBe("phone_number");
//   });

//   it("should validate formula property", () => {
//     const formulaProperty = {
//       type: "formula",
//       formula: {
//         expression: 'prop("Number") * 2'
//       }
//     };

//     expect(validateDatabaseProperty(formulaProperty)).toBe(true);
//     expect(getDatabasePropertyType(formulaProperty as DatabaseProperty)).toBe("formula");
//   });

//   it("should validate relation property", () => {
//     const relationProperty = {
//       type: "relation",
//       relation: {
//         database_id: "db_123",
//         type: "dual_property",
//         dual_property: {
//           synced_property_name: "Related Items",
//           synced_property_id: "prop_456"
//         }
//       }
//     };

//     expect(validateDatabaseProperty(relationProperty)).toBe(true);
//     expect(getDatabasePropertyType(relationProperty as DatabaseProperty)).toBe("relation");
//   });

//   it("should validate rollup property", () => {
//     const rollupProperty = {
//       type: "rollup",
//       rollup: {
//         relation_property_name: "Related Items",
//         relation_property_id: "prop_123",
//         rollup_property_name: "Count",
//         rollup_property_id: "prop_456",
//         function: "count"
//       }
//     };

//     expect(validateDatabaseProperty(rollupProperty)).toBe(true);
//     expect(getDatabasePropertyType(rollupProperty as DatabaseProperty)).toBe("rollup");
//   });

//   it("should validate created time property", () => {
//     const createdTimeProperty = {
//       type: "created_time",
//       created_time: {}
//     };

//     expect(validateDatabaseProperty(createdTimeProperty)).toBe(true);
//     expect(getDatabasePropertyType(createdTimeProperty as DatabaseProperty)).toBe("created_time");
//   });

//   it("should validate created by property", () => {
//     const createdByProperty = {
//       type: "created_by",
//       created_by: {}
//     };

//     expect(validateDatabaseProperty(createdByProperty)).toBe(true);
//     expect(getDatabasePropertyType(createdByProperty as DatabaseProperty)).toBe("created_by");
//   });

//   it("should validate last edited time property", () => {
//     const lastEditedTimeProperty = {
//       type: "last_edited_time",
//       last_edited_time: {}
//     };

//     expect(validateDatabaseProperty(lastEditedTimeProperty)).toBe(true);
//     expect(getDatabasePropertyType(lastEditedTimeProperty as DatabaseProperty)).toBe("last_edited_time");
//   });

//   it("should validate last edited by property", () => {
//     const lastEditedByProperty = {
//       type: "last_edited_by",
//       last_edited_by: {}
//     };

//     expect(validateDatabaseProperty(lastEditedByProperty)).toBe(true);
//     expect(getDatabasePropertyType(lastEditedByProperty as DatabaseProperty)).toBe("last_edited_by");
//   });

//   it("should validate unique id property", () => {
//     const uniqueIdProperty = {
//       type: "unique_id",
//       unique_id: {
//         prefix: "TASK-"
//       }
//     };

//     expect(validateDatabaseProperty(uniqueIdProperty)).toBe(true);
//     expect(getDatabasePropertyType(uniqueIdProperty as DatabaseProperty)).toBe("unique_id");
//   });

//   it("should validate button property", () => {
//     const buttonProperty = {
//       type: "button",
//       button: {}
//     };

//     expect(validateDatabaseProperty(buttonProperty)).toBe(true);
//     expect(getDatabasePropertyType(buttonProperty as DatabaseProperty)).toBe("button");
//   });

//   it("should reject invalid property", () => {
//     const invalidProperty = {
//       type: "invalid_type",
//       invalid_field: {}
//     };

//     expect(validateDatabaseProperty(invalidProperty)).toBe(false);
//   });

//   it("should reject property with wrong structure", () => {
//     const wrongStructureProperty = {
//       type: "title",
//       // Missing required 'title' field
//       wrong_field: {}
//     };

//     expect(validateDatabaseProperty(wrongStructureProperty)).toBe(false);
//   });

//   it("should reject property with invalid number format", () => {
//     const invalidNumberProperty = {
//       type: "number",
//       number: {
//         format: "invalid_format"
//       }
//     };

//     expect(validateDatabaseProperty(invalidNumberProperty)).toBe(false);
//   });

//   it("should reject property with invalid color", () => {
//     const invalidColorProperty = {
//       type: "select",
//       select: {
//         options: [
//           {
//             name: "Option 1",
//             color: "invalid_color"
//           }
//         ]
//       }
//     };

//     expect(validateDatabaseProperty(invalidColorProperty)).toBe(false);
//   });

//   it("should reject property missing required fields", () => {
//     const missingFieldsProperty = {
//       type: "formula"
//       // Missing required 'formula' field
//     };

//     expect(validateDatabaseProperty(missingFieldsProperty)).toBe(false);
//   });
// });

// describe("Page Property Value Schema", () => {
//   it("should validate title value", () => {
//     const titleValue = {
//       type: "title",
//       title: [
//         {
//           type: "text",
//           text: {
//             content: "Sample Title"
//           },
//           annotations: {
//             bold: false,
//             italic: false,
//             strikethrough: false,
//             underline: false,
//             code: false,
//             color: "default"
//           },
//           plain_text: "Sample Title",
//           href: null
//         }
//       ],
//       id: "prop_123"
//     };

//     expect(validatePagePropertyValue(titleValue)).toBe(true);
//     expect(getPagePropertyValueType(titleValue as PagePropertyValue)).toBe("title");
//     expect(isPagePropertyValueOfType(titleValue as PagePropertyValue, "title")).toBe(true);
//   });

//   it("should validate rich text value", () => {
//     const richTextValue = {
//       type: "rich_text",
//       rich_text: [
//         {
//           type: "text",
//           text: {
//             content: "Sample text"
//           },
//           annotations: {
//             bold: false,
//             italic: false,
//             strikethrough: false,
//             underline: false,
//             code: false,
//             color: "default"
//           },
//           plain_text: "Sample text",
//           href: null
//         }
//       ],
//       id: "prop_456"
//     };

//     expect(validatePagePropertyValue(richTextValue)).toBe(true);
//     expect(getPagePropertyValueType(richTextValue as PagePropertyValue)).toBe("rich_text");
//   });

//   it("should validate number value", () => {
//     const numberValue = {
//       type: "number",
//       number: 42,
//       id: "prop_789"
//     };

//     expect(validatePagePropertyValue(numberValue)).toBe(true);
//     expect(getPagePropertyValueType(numberValue as PagePropertyValue)).toBe("number");
//   });

//   it("should validate null number value", () => {
//     const nullNumberValue = {
//       type: "number",
//       number: null,
//       id: "prop_789"
//     };

//     expect(validatePagePropertyValue(nullNumberValue)).toBe(true);
//     expect(getPagePropertyValueType(nullNumberValue as PagePropertyValue)).toBe("number");
//   });

//   it("should validate select value", () => {
//     const selectValue = {
//       type: "select",
//       select: {
//         id: "opt_1",
//         name: "Option 1",
//         color: "blue"
//       },
//       id: "prop_abc"
//     };

//     expect(validatePagePropertyValue(selectValue)).toBe(true);
//     expect(getPagePropertyValueType(selectValue as PagePropertyValue)).toBe("select");
//   });

//   it("should validate checkbox value", () => {
//     const checkboxValue = {
//       type: "checkbox",
//       checkbox: true,
//       id: "prop_stu"
//     };

//     expect(validatePagePropertyValue(checkboxValue)).toBe(true);
//     expect(getPagePropertyValueType(checkboxValue as PagePropertyValue)).toBe("checkbox");
//   });

//   it("should validate url value", () => {
//     const urlValue = {
//       type: "url",
//       url: "https://example.com",
//       id: "prop_vwx"
//     };

//     expect(validatePagePropertyValue(urlValue)).toBe(true);
//     expect(getPagePropertyValueType(urlValue as PagePropertyValue)).toBe("url");
//   });

//   it("should validate null url value", () => {
//     const nullUrlValue = {
//       type: "url",
//       url: null,
//       id: "prop_vwx"
//     };

//     expect(validatePagePropertyValue(nullUrlValue)).toBe(true);
//     expect(getPagePropertyValueType(nullUrlValue as PagePropertyValue)).toBe("url");
//   });

//   it("should validate email value", () => {
//     const emailValue = {
//       type: "email",
//       email: "test@example.com",
//       id: "prop_yz1"
//     };

//     expect(validatePagePropertyValue(emailValue)).toBe(true);
//     expect(getPagePropertyValueType(emailValue as PagePropertyValue)).toBe("email");
//   });

//   it("should validate phone number value", () => {
//     const phoneValue = {
//       type: "phone_number",
//       phone_number: "+1-555-123-4567",
//       id: "prop_234"
//     };

//     expect(validatePagePropertyValue(phoneValue)).toBe(true);
//     expect(getPagePropertyValueType(phoneValue as PagePropertyValue)).toBe("phone_number");
//   });

//   it("should validate formula value - string", () => {
//     const formulaValue = {
//       type: "formula",
//       formula: {
//         type: "string",
//         string: "Calculated Result"
//       },
//       id: "prop_567"
//     };

//     expect(validatePagePropertyValue(formulaValue)).toBe(true);
//     expect(getPagePropertyValueType(formulaValue as PagePropertyValue)).toBe("formula");
//   });

//   it("should validate formula value - number", () => {
//     const formulaValue = {
//       type: "formula",
//       formula: {
//         type: "number",
//         number: 42.5
//       },
//       id: "prop_567"
//     };

//     expect(validatePagePropertyValue(formulaValue)).toBe(true);
//     expect(getPagePropertyValueType(formulaValue as PagePropertyValue)).toBe("formula");
//   });

//   it("should validate formula value - boolean", () => {
//     const formulaValue = {
//       type: "formula",
//       formula: {
//         type: "boolean",
//         boolean: true
//       },
//       id: "prop_567"
//     };

//     expect(validatePagePropertyValue(formulaValue)).toBe(true);
//     expect(getPagePropertyValueType(formulaValue as PagePropertyValue)).toBe("formula");
//   });

//   it("should validate created time value", () => {
//     const createdTimeValue = {
//       type: "created_time",
//       created_time: "2024-01-15T10:30:00.000Z",
//       id: "prop_ghi"
//     };

//     expect(validatePagePropertyValue(createdTimeValue)).toBe(true);
//     expect(getPagePropertyValueType(createdTimeValue as PagePropertyValue)).toBe("created_time");
//   });

//   it("should validate unique id value", () => {
//     const uniqueIdValue = {
//       type: "unique_id",
//       unique_id: {
//         number: 123,
//         prefix: "TASK-"
//       },
//       id: "prop_stu"
//     };

//     expect(validatePagePropertyValue(uniqueIdValue)).toBe(true);
//     expect(getPagePropertyValueType(uniqueIdValue as PagePropertyValue)).toBe("unique_id");
//   });

//   it("should validate button value", () => {
//     const buttonValue = {
//       type: "button",
//       button: {},
//       id: "prop_vwx"
//     };

//     expect(validatePagePropertyValue(buttonValue)).toBe(true);
//     expect(getPagePropertyValueType(buttonValue as PagePropertyValue)).toBe("button");
//   });

//   it("should reject invalid property value", () => {
//     const invalidValue = {
//       type: "invalid_type",
//       invalid_field: "test",
//       id: "prop_xyz"
//     };

//     expect(validatePagePropertyValue(invalidValue)).toBe(false);
//   });

//   it("should reject property value with wrong structure", () => {
//     const wrongStructureValue = {
//       type: "number",
//       // Missing required 'number' field
//       wrong_field: 42,
//       id: "prop_123"
//     };

//     expect(validatePagePropertyValue(wrongStructureValue)).toBe(false);
//   });

//   it("should reject property value missing required id", () => {
//     const missingIdValue = {
//       type: "checkbox",
//       checkbox: true
//       // Missing required 'id' field
//     };

//     expect(validatePagePropertyValue(missingIdValue)).toBe(false);
//   });

//   it("should reject property value with invalid annotation color", () => {
//     const invalidColorValue = {
//       type: "title",
//       title: [
//         {
//           type: "text",
//           text: {
//             content: "Sample Title"
//           },
//           annotations: {
//             bold: false,
//             italic: false,
//             strikethrough: false,
//             underline: false,
//             code: false,
//             color: "invalid_color"
//           },
//           plain_text: "Sample Title",
//           href: null
//         }
//       ],
//       id: "prop_123"
//     };

//     expect(validatePagePropertyValue(invalidColorValue)).toBe(false);
//   });

//   it("should reject property value with invalid formula result type", () => {
//     const invalidFormulaValue = {
//       type: "formula",
//       formula: {
//         type: "invalid_type",
//         invalid_type: "result"
//       },
//       id: "prop_567"
//     };

//     expect(validatePagePropertyValue(invalidFormulaValue)).toBe(false);
//   });

//   it("should reject property value with invalid select color", () => {
//     const invalidSelectValue = {
//       type: "select",
//       select: {
//         id: "opt_1",
//         name: "Option 1",
//         color: "invalid_color"
//       },
//       id: "prop_abc"
//     };

//     expect(validatePagePropertyValue(invalidSelectValue)).toBe(false);
//   });
// });

// describe("Property Type Checking", () => {
//   it("should correctly identify database property types", () => {
//     const titleProperty = {
//       type: "title",
//       title: {}
//     } as DatabaseProperty;

//     expect(isDatabasePropertyOfType(titleProperty, "title")).toBe(true);
//     expect(isDatabasePropertyOfType(titleProperty, "rich_text")).toBe(false);
//   });

//   it("should correctly identify page property value types", () => {
//     const numberValue = {
//       type: "number",
//       number: 42,
//       id: "prop_123"
//     } as PagePropertyValue;

//     expect(isPagePropertyValueOfType(numberValue, "number")).toBe(true);
//     expect(isPagePropertyValueOfType(numberValue, "text")).toBe(false);
//   });
// });

// describe("Validation Edge Cases", () => {
//   it("should reject completely empty objects", () => {
//     expect(validateDatabaseProperty({})).toBe(false);
//     expect(validatePagePropertyValue({})).toBe(false);
//   });

//   it("should reject null values", () => {
//     expect(validateDatabaseProperty(null)).toBe(false);
//     expect(validatePagePropertyValue(null)).toBe(false);
//   });

//   it("should reject undefined values", () => {
//     expect(validateDatabaseProperty(undefined)).toBe(false);
//     expect(validatePagePropertyValue(undefined)).toBe(false);
//   });

//   it("should reject primitive values", () => {
//     expect(validateDatabaseProperty("string")).toBe(false);
//     expect(validateDatabaseProperty(42)).toBe(false);
//     expect(validateDatabaseProperty(true)).toBe(false);
//     expect(validatePagePropertyValue("string")).toBe(false);
//     expect(validatePagePropertyValue(42)).toBe(false);
//     expect(validatePagePropertyValue(true)).toBe(false);
//   });

//   it("should reject arrays", () => {
//     expect(validateDatabaseProperty([])).toBe(false);
//     expect(validatePagePropertyValue([])).toBe(false);
//   });

//   it("should reject objects with only some required fields", () => {
//     const partialDatabaseProperty = {
//       type: "title"
//       // Missing 'title' field
//     };

//     const partialPagePropertyValue = {
//       type: "number",
//       number: 42
//       // Missing 'id' field
//     };

//     expect(validateDatabaseProperty(partialDatabaseProperty)).toBe(false);
//     expect(validatePagePropertyValue(partialPagePropertyValue)).toBe(false);
//   });

//   it("should validate minimal valid properties", () => {
//     const minimalDatabaseProperty = {
//       type: "title",
//       title: {}
//     };

//     const minimalPagePropertyValue = {
//       type: "number",
//       number: 42,
//       id: "prop_123"
//     };

//     expect(validateDatabaseProperty(minimalDatabaseProperty)).toBe(true);
//     expect(validatePagePropertyValue(minimalPagePropertyValue)).toBe(true);
//   });
// });

// describe("Complex Property Validation", () => {
//   it("should validate complex select property with multiple options", () => {
//     const complexSelectProperty = {
//       type: "select",
//       select: {
//         options: [
//           { name: "High", color: "red" },
//           { name: "Medium", color: "yellow" },
//           { name: "Low", color: "green" },
//           { name: "Critical", id: "opt_crit", color: "purple" }
//         ]
//       }
//     };

//     expect(validateDatabaseProperty(complexSelectProperty)).toBe(true);
//   });

//   it("should validate complex status property", () => {
//     const complexStatusProperty = {
//       type: "status",
//       status: {
//         options: [
//           { name: "Not Started", color: "default" },
//           { name: "In Progress", color: "blue" },
//           { name: "Done", color: "green" }
//         ],
//         groups: [
//           { name: "To Do", color: "gray", option_ids: ["opt_1"] },
//           { name: "Doing", color: "yellow", option_ids: ["opt_2"] },
//           { name: "Complete", color: "green", option_ids: ["opt_3"] }
//         ]
//       }
//     };

//     expect(validateDatabaseProperty(complexStatusProperty)).toBe(true);
//   });

//   it("should validate complex title value with rich text", () => {
//     const complexTitleValue = {
//       type: "title",
//       title: [
//         {
//           type: "text",
//           text: {
//             content: "Task: "
//           },
//           annotations: {
//             bold: true,
//             italic: false,
//             strikethrough: false,
//             underline: false,
//             code: false,
//             color: "default"
//           },
//           plain_text: "Task: ",
//           href: null
//         },
//         {
//           type: "text",
//           text: {
//             content: "Implement validation"
//           },
//           annotations: {
//             bold: false,
//             italic: true,
//             strikethrough: false,
//             underline: false,
//             code: false,
//             color: "blue"
//           },
//           plain_text: "Implement validation",
//           href: null
//         }
//       ],
//       id: "prop_title"
//     };

//     expect(validatePagePropertyValue(complexTitleValue)).toBe(true);
//   });

//   it("should validate formula with date result", () => {
//     const formulaWithDateValue = {
//       type: "formula",
//       formula: {
//         type: "date",
//         date: "2024-01-01T12:00:00.000Z"
//       },
//       id: "prop_formula"
//     };

//     expect(validatePagePropertyValue(formulaWithDateValue)).toBe(true);
//   });

//   it("should validate formula with null result", () => {
//     const formulaWithNullValue = {
//       type: "formula",
//       formula: {
//         type: "string",
//         string: null
//       },
//       id: "prop_formula"
//     };

//     expect(validatePagePropertyValue(formulaWithNullValue)).toBe(true);
//   });

//   it("should validate unique id with prefix", () => {
//     const uniqueIdWithPrefix = {
//       type: "unique_id",
//       unique_id: {
//         number: 1001,
//         prefix: "PROJ-"
//       },
//       id: "prop_unique"
//     };

//     expect(validatePagePropertyValue(uniqueIdWithPrefix)).toBe(true);
//   });

//   it("should validate unique id without prefix", () => {
//     const uniqueIdWithoutPrefix = {
//       type: "unique_id",
//       unique_id: {
//         number: 42
//       },
//       id: "prop_unique"
//     };

//     expect(validatePagePropertyValue(uniqueIdWithoutPrefix)).toBe(true);
//   });

//   it("should validate null select value", () => {
//     const nullSelectValue = {
//       type: "select",
//       select: null,
//       id: "prop_select"
//     };

//     expect(validatePagePropertyValue(nullSelectValue)).toBe(true);
//   });
// });
