import { GENERATOR as ASTRING_GENERATOR, generate } from "astring";
import {
	type ImportDeclaration,
	type ParenthesizedExpression as OxcParenthesizedExpression,
	type Program,
	type Statement,
	parseSync,
} from "oxc-parser";

/**
 * Transforms ESM module code into runtime-executable code by:
 * - Converting imports for specified globals into variable declarations
 * - Removing other ESM imports
 * - Removing ESM exports
 * - Adding standardized return statement
 */
export function createImportsTransformPlugin(globals: Record<string, string>) {
	return {
		name: "transform-imports-for-eval",
		renderChunk(code: string): { code: string; map: null } | null {
			try {
				const result = parseSync("virtual.js", code, { sourceType: "module" });

				if (result.errors.length > 0) {
					console.warn(
						"Parsing errors in transform-imports plugin:",
						result.errors,
					);
				}

				const ast = result.program as Program;
				if (!ast || !ast.body) {
					console.error(
						"[transformImportsPlugin] Parsing failed or AST has no body.",
					);
					return null;
				}

				let globalReferences = "";
				const newBody: Statement[] = [];

				for (const node of ast.body) {
					if (node.type === "ImportDeclaration") {
						const importNode = node as ImportDeclaration;
						const source = importNode.source.value;

						if (globals[source]) {
							const globalVarName = globals[source];
							if (importNode.specifiers) {
								for (const specifier of importNode.specifiers) {
									if (specifier.type === "ImportSpecifier") {
										const localName = specifier.local.name;
										let importedName: string;
										if (specifier.imported.type === "Identifier") {
											importedName = specifier.imported.name;
										} else {
											importedName = specifier.imported.value;
										}
										globalReferences += `const ${localName} = ${globalVarName}.${importedName};\n`;
									} else if (specifier.type === "ImportDefaultSpecifier") {
										const localName = specifier.local.name;
										globalReferences += `const ${localName} = ${globalVarName}.default || ${globalVarName};\n`;
									} else if (specifier.type === "ImportNamespaceSpecifier") {
										const localName = specifier.local.name;
										globalReferences += `const ${localName} = ${globalVarName};\n`;
									}
								}
							}
							continue;
						}
						continue;
					}

					if (
						!(typeof node.type === "string" && node.type.includes("Export"))
					) {
						newBody.push(node);
					}
				}

				const modifiedAst: Program = {
					...ast,
					body: newBody,
				};

				const customGenerator = {
					...ASTRING_GENERATOR,
					ParenthesizedExpression(
						node: OxcParenthesizedExpression,
						state: { write: (value: string) => void },
					) {
						state.write("(");
						// biome-ignore lint/suspicious/noExplicitAny: astring type limitation
						(this as any)[node.expression.type](node.expression, state);
						state.write(")");
					},
				};

				const processedCode = generate(modifiedAst, {
					generator: customGenerator,
				});

				const exportsStatement = `return {
  default: typeof MDXContent !== 'undefined' ? MDXContent : null,
  frontmatter: typeof frontmatter !== 'undefined' ? frontmatter : {}
};`;

				return {
					code: `${globalReferences}${processedCode}\n${exportsStatement}`,
					map: null,
				};
			} catch (error) {
				console.error(
					"Error in transform-imports-for-eval (astring) plugin:",
					error,
				);
				if (
					error instanceof Error &&
					error.message.includes("generator[node.type] is not a function")
				) {
					console.error(
						"This specific error often indicates an AST node type that astring cannot handle.",
					);
				}
				return null;
			}
		},
	};
}
