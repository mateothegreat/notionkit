// import fs from "fs";
// import path from "path";
// import { Project, Type } from "ts-morph";

// /**
//  * This function recursively converts TypeScript types to ArkType schema declarations
//  */
// function convertTsTypeToArkType(type: Type, processedTypes: Set<string>, depth: number = 0): string {
//   if (depth > 40) return 'type("any")'; // Prevent infinite recursion

//   // Handle type alias (reference to another type)
//   const aliasSymbol = type.getAliasSymbol();
//   if (aliasSymbol && processedTypes.has(aliasSymbol.getName())) {
//     return `${aliasSymbol.getName()}Schema`;
//   }

//   // Handle union
//   if (type.isUnion()) {
//     const unionTypes = type
//       .getUnionTypes()
//       .map((t) => convertTsTypeToArkType(t, processedTypes, depth + 1))
//       .filter((t) => !["type('never')", "type('any')"].includes(t));
//     if (unionTypes.length === 0) return 'type("any")';
//     return `(${unionTypes.join(").or(")})`;
//   }

//   // Handle intersection
//   if (type.isIntersection()) {
//     const intersectionTypes = type
//       .getIntersectionTypes()
//       .map((t) => convertTsTypeToArkType(t, processedTypes, depth + 1));
//     return `(${intersectionTypes.join(").and(")})`;
//   }

//   // Literal types
//   if (type.isStringLiteral()) return `type("'${type.getLiteralValue()}'")`;
//   if (type.isNumberLiteral()) return `type(${type.getLiteralValue()})`;
//   if (type.isBooleanLiteral()) return `type(${type.getLiteralValue()})`;

//   // Primitive types
//   if (type.isString()) return 'type("string")';
//   if (type.isNumber()) return 'type("number")';
//   if (type.isBoolean()) return 'type("boolean")';
//   if (type.isNull()) return 'type("null")';
//   if (type.isUndefined()) return 'type("undefined")';
//   if (type.isAny() || type.isUnknown()) return 'type("any")';
//   if (type.isNever()) return 'type("never")';

//   // Array types
//   if (type.isArray()) {
//     const elType = type.getArrayElementTypeOrThrow();
//     return `(${convertTsTypeToArkType(elType, processedTypes, depth + 1)}).array()`;
//   }

//   // Date special case
//   const symbol = type.getSymbol();
//   if (symbol?.getName() === "Date") return 'type("Date")';

//   // Objects and interfaces
//   if (type.isObject()) {
//     const props: string[] = [];
//     for (const p of type.getProperties()) {
//       const propDec = p.getValueDeclaration();
//       if (!propDec) continue;
//       const valueType = propDec.getType();
//       const isOptional = p.isOptional();
//       const propTypeStr = convertTsTypeToArkType(valueType, processedTypes, depth + 1);
//       props.push(`"${p.getName()}${isOptional ? "?" : ""}": ${propTypeStr}`);
//     }
//     // Handle Record<string, T> like `[string]: ...`
//     if (props.length === 0 && type.getStringIndexType()) {
//       return `type({ "[string]": ${convertTsTypeToArkType(type.getStringIndexType()!, processedTypes, depth + 1)} })`;
//     }
//     return `type({ ${props.join(", ")} })`;
//   }
//   return 'type("any")';
// }

// async function generateArkTypeSchemas() {
//   // Adjust paths as needed for your workspace!
//   const NOTION_TYPES_PATH = path.resolve(__dirname, "../.notion/api-endpoints.d.ts");
//   const OUT_PATH = path.resolve(__dirname, "../src/lib/schemas/notion-generated.ts");

//   const project = new Project({
//     compilerOptions: {
//       strict: true,
//       strictNullChecks: true,
//       target: 99, // ES2022
//       module: 199, // NodeNext
//       moduleResolution: 3, // NodeNext
//       esModuleInterop: true
//     }
//   });

//   const src = project.addSourceFileAtPath(NOTION_TYPES_PATH);

//   // Collect all type names
//   const processedTypes = new Set<string>();
//   const decls = [...src.getTypeAliases(), ...src.getInterfaces()];
//   for (const d of decls) processedTypes.add(d.getName());

//   let declBlock = "";
//   let assignBlock = "";

//   for (const name of processedTypes) {
//     const decl = src.getTypeAlias(name) ?? src.getInterface(name);
//     if (!decl) continue;
//     const schemaName = `${name}Schema`;

//     // Because ArkType schemas are lazy initially, use "let", not "const"
//     declBlock += `export let ${schemaName}: any;\n`;
//     const arktypeStr = convertTsTypeToArkType(decl.getType(), processedTypes);
//     assignBlock += `${schemaName} = ${arktypeStr};\n\n`;
//   }

//   // Generate file content
//   const outputContent =
//     `// This file is generated. DO NOT EDIT.\n` +
//     `import { type } from "arktype";\n\n` +
//     declBlock +
//     "\n" +
//     assignBlock;

//   // Validate output file is valid TypeScript (optional)
//   const tempTestPath = path.resolve(__dirname, "temp-typecheck.ts");
//   project.createSourceFile(tempTestPath, outputContent, { overwrite: true });
//   const diagnostics = project.getPreEmitDiagnostics();
//   if (diagnostics.length > 0) {
//     for (const diag of diagnostics) {
//       console.error(diag.getMessageText());
//     }
//     throw new Error("ArkType codegen failed due to TS error");
//   }

//   fs.writeFileSync(OUT_PATH, outputContent, "utf-8");
//   console.log(`✅ ArkType schemas generated to ${OUT_PATH}`);
// }

// generateArkTypeSchemas().catch((err) => {
//   console.error(err);
//   process.exit(1);
// });
import { Type } from "ts-morph";

export function convertTsTypeToArkType(tsType: Type, depth: number, processedTypes: Set<string>): string {
  if (depth > 40) {
    return 'type("any")';
  }

  const aliasSymbol = tsType.getAliasSymbol();
  if (aliasSymbol) {
    const aliasName = aliasSymbol.getName();
    if (processedTypes.has(aliasName)) {
      return `${aliasName}Schema`;
    }
  }

  if (tsType.isUnion()) {
    const unionTypes = tsType
      .getUnionTypes()
      .map((t) => convertTsTypeToArkType(t, depth + 1, processedTypes))
      .filter((t) => t !== 'type("any")' && t !== 'type("never")');
    if (unionTypes.length === 0) return 'type("any")';
    return `(${unionTypes.join(").or(")})`;
  }

  if (tsType.isIntersection()) {
    const intersectionTypes = tsType.getIntersectionTypes();
    const objectTypes = intersectionTypes.filter((t) => t.isObject());

    if (objectTypes.length === intersectionTypes.length) {
      const allProperties = new Map<string, string>();
      for (const t of objectTypes) {
        for (const prop of t.getProperties()) {
          const propName = prop.getName();
          const valueDeclaration = prop.getValueDeclaration();
          if (!valueDeclaration) continue;

          const propType = valueDeclaration.getType();
          const isOptional = prop.isOptional();
          const propTypeString = convertTsTypeToArkType(propType, depth + 1, processedTypes);

          allProperties.set(`"${propName}${isOptional ? "?" : ""}"`, propTypeString);
        }
      }
      const propsStrings = Array.from(allProperties.entries()).map(([key, value]) => `${key}: ${value}`);
      return `type({ ${propsStrings.join(", ")} })`;
    } else {
      return `(${intersectionTypes.map((t) => convertTsTypeToArkType(t, depth + 1, processedTypes)).join(").and(")})`;
    }
  }

  if (tsType.isStringLiteral()) return `type("'${tsType.getLiteralValue()}'")`;
  if (tsType.isNumberLiteral()) return `type("${tsType.getLiteralValue()}")`;
  if (tsType.isBooleanLiteral()) return `type("${tsType.getLiteralValue()}")`;

  if (tsType.isString()) return 'type("string")';
  if (tsType.isNumber()) return 'type("number")';
  if (tsType.isBoolean()) return 'type("boolean")';
  if (tsType.isAny() || tsType.isUnknown()) return 'type("any")';
  if (tsType.isNull()) return 'type("null")';
  if (tsType.isUndefined()) return 'type("undefined")';
  if (tsType.isNever()) return 'type("never")';

  if (tsType.isArray()) {
    const elementType = tsType.getArrayElementTypeOrThrow();
    return `(${convertTsTypeToArkType(elementType, depth + 1, processedTypes)}).array()`;
  }

  const symbol = tsType.getSymbol();
  if (symbol?.getName() === "Date") return 'type("Date")';

  if (aliasSymbol) {
    return `${aliasSymbol.getName()}Schema`;
  }

  if (tsType.isObject() || tsType.isInterface()) {
    if (tsType.getProperties().length === 0 && !tsType.getStringIndexType()) {
      return "type({})";
    }

    const propsStrings: string[] = [];
    const properties = tsType.getProperties();

    for (const prop of properties) {
      const propName = prop.getName();
      const valueDeclaration = prop.getValueDeclaration();

      if (!valueDeclaration) continue;

      const propType = valueDeclaration.getType();
      const isOptional = prop.isOptional();
      const propTypeString = convertTsTypeToArkType(propType, depth + 1, processedTypes);

      propsStrings.push(`"${propName}${isOptional ? "?" : ""}": ${propTypeString}`);
    }

    if (properties.length === 0) {
      const stringIndexType = tsType.getStringIndexType();
      if (stringIndexType) {
        return `type({ "[string]": ${convertTsTypeToArkType(stringIndexType, depth + 1, processedTypes)} })`;
      }
    }

    return `type({ ${propsStrings.join(", ")} })`;
  }

  console.warn(`Unhandled type: ${tsType.getText()}`);
  return 'type("any")';
}
