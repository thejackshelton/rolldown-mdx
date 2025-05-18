import { generate } from "astring";
import { parseSync } from "oxc-parser";

/**
 * Transforms ESM module code into runtime-executable code by:
 * - Converting imports to global references
 * - Removing ESM exports
 * - Adding standardized return statement
 * - Enabling direct evaluation via new Function()/eval()
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

				const ast = result.program;
				const imports: Array<{ source: string; specifiers: string[] }> = [];

				const bodyWithoutImports = ast.body.filter((node) => {
					if (typeof node.type !== "string") return true;
					if (node.type !== "ImportDeclaration") return true;

					const importNode = node as {
						source: { value: string };
						specifiers?: Array<{
							local?: { name: string };
							imported?: { name: string };
						}>;
					};

					const source = String(importNode.source.value);
					const specifiers = (importNode.specifiers || [])
						.map((spec) => spec.local?.name || spec.imported?.name || "default")
						.filter(Boolean);

					if (specifiers.length > 0) {
						imports.push({ source, specifiers });
					}

					return false;
				});

				const bodyWithoutExports = bodyWithoutImports.filter(
					(node) =>
						!(typeof node.type === "string" && node.type.includes("Export")),
				);

				const modifiedAst = { ...ast, body: bodyWithoutExports };
				const processedCode = generate(modifiedAst);

				let globalReferences = "";
				for (const { source, specifiers } of imports) {
					if (!Object.keys(globals).includes(source)) continue;

					for (const specifier of specifiers) {
						globalReferences += `const ${specifier} = ${globals[source]}.${specifier};\n`;
					}
				}

				const exportsStatement = `return {
  default: typeof MDXContent !== 'undefined' ? MDXContent : null,
  frontmatter: typeof frontmatter !== 'undefined' ? frontmatter : {}
};`;

				return {
					code: `${globalReferences}${processedCode}\n${exportsStatement}`,
					map: null,
				};
			} catch (error) {
				console.error("Error transforming imports:", error);
				return null;
			}
		},
	};
}
