import { rolldown, type InputOptions, type OutputOptions } from "rolldown";
import mdx from "@mdx-js/rollup";
import type { Options as MdxPluginOptions } from "@mdx-js/rollup";
import remarkFrontmatter from "remark-frontmatter";
import remarkMdxFrontmatter from "remark-mdx-frontmatter";
import { VFile } from "vfile";
import matter from "gray-matter";
import { resolve, dirname, extname } from "pathe";
import { qwikRollup } from "@builder.io/qwik/optimizer";
import { parseSync } from "oxc-parser";
import { generate } from "astring";

export interface MdxJsxConfig {
	jsxLib?: {
		varName?: string;
		package?: string;
	};
	jsxRuntime?: {
		varName?: string;
		package?: string;
	};
	jsxDom?: {
		varName?: string;
		package?: string;
	};
}

export interface BundleMDXOptions {
	source: string | VFile;
	files?: Record<string, string>;
	cwd?: string;
	mdxOptions?: (
		options: MdxPluginOptions,
		frontmatter: Record<string, unknown>,
	) => MdxPluginOptions;
	globals?: Record<string, string>;
	jsxConfig?: MdxJsxConfig;
	resolveExtensions?: string[];
	debug?: boolean;
}

export interface BundleMDXResult {
	code: string;
	frontmatter: Record<string, unknown>;
	matter: ReturnType<typeof matter>;
	errors: Error[];
	warnings: Error[];
}

export async function bundleMDX({
	source,
	files = {},
	cwd = process.cwd(),
	mdxOptions: mdxOptionsFn,
	globals = {},
	jsxConfig = {},
	resolveExtensions = [".tsx", ".ts", ".jsx", ".js", ".mdx", ".json"],
	debug: isDebugMode = false,
}: BundleMDXOptions): Promise<BundleMDXResult> {
	const debug = (...args: unknown[]) => {
		if (isDebugMode) {
			console.log(...args);
		}
	};

	debug("[bundleMDX] Initial options:", {
		source: typeof source === "string" ? "string" : "VFile",
		files: Object.keys(files),
		cwd,
		hasMdxOptionsFn: !!mdxOptionsFn,
		globals,
		jsxConfig,
		resolveExtensions,
		debug,
	});

	const processedFiles: Record<string, string> = {};
	for (const [key, value] of Object.entries(files)) {
		const absoluteKey = resolve(cwd, key);
		processedFiles[absoluteKey] = value;
	}
	debug("[bundleMDX] Processed files map (keys):", Object.keys(processedFiles));

	if (typeof source === "string") {
		debug(
			"[bundleMDX] Source string (first 100 chars):",
			source.substring(0, 100),
		);
	} else {
		debug("[bundleMDX] Source VFile path:", source.path);
		debug(
			"[bundleMDX] Source VFile value (first 100 chars):",
			String(source.value).substring(0, 100),
		);
	}

	const entryPointId = "entry.mdx";
	let vfile: VFile;

	if (typeof source === "string") {
		vfile = new VFile({
			value: source,
			path: resolve(cwd, "source.mdx"),
		});
	} else {
		vfile = source;
		if (!vfile.path) {
			vfile.path = resolve(cwd, "source.mdx");
		}
	}

	const {
		data: frontmatterData,
		content: mdxBody,
		...restOfMatter
	} = matter(String(vfile.value));

	const frontmatter = frontmatterData || {};
	debug("[bundleMDX] Extracted frontmatter:", frontmatter);
	debug(
		"[bundleMDX] MDX content after frontmatter (first 100 chars):",
		mdxBody.substring(0, 100),
	);

	vfile.value = mdxBody;

	const mdxFileStructure = {
		data: frontmatter,
		content: mdxBody,
		...restOfMatter,
	};

	function findPathWithExt(
		basePath: string,
		extensions: string[],
		filesMap: Record<string, string>,
	): string | null {
		for (const ext of extensions) {
			const pathWithExt = basePath + ext;
			const isPathWithExtMatch = Object.prototype.hasOwnProperty.call(
				filesMap,
				pathWithExt,
			);
			if (isPathWithExtMatch) {
				return pathWithExt;
			}
		}
		return null;
	}

	const inMemoryPlugin = {
		name: "in-memory-loader",
		resolveId(id: string, importer?: string) {
			debug(
				`[inMemoryPlugin.resolveId] Attempting to resolve: '${id}' from importer: '${importer}'`,
			);

			if (id === entryPointId || id === `./${entryPointId}`) {
				debug(
					`[inMemoryPlugin.resolveId] Resolved '${id}' to special entry point '${entryPointId}'`,
				);
				return entryPointId;
			}

			let baseDir: string;
			if (importer) {
				if (importer === entryPointId) {
					baseDir = dirname(vfile.path);
				} else {
					baseDir = dirname(importer);
				}
			} else {
				baseDir = cwd;
			}

			const resolvedImportPath = resolve(baseDir, id);
			debug(
				`[inMemoryPlugin.resolveId] Resolved import path for '${id}': ${resolvedImportPath}`,
			);

			const isDirectKeyMatch = Object.prototype.hasOwnProperty.call(
				processedFiles,
				resolvedImportPath,
			);
			if (isDirectKeyMatch) {
				debug(
					`[inMemoryPlugin.resolveId] Resolved '${id}' to '${resolvedImportPath}' from processedFiles (direct key match).`,
				);
				return resolvedImportPath;
			}

			const importPathLacksExtension = !extname(resolvedImportPath);

			if (importPathLacksExtension) {
				const resolvedFullPath = findPathWithExt(
					resolvedImportPath,
					resolveExtensions,
					processedFiles,
				);
				if (resolvedFullPath) {
					debug(
						`[inMemoryPlugin.resolveId] Resolved '${id}' to '${resolvedFullPath}' from processedFiles (added extension).`,
					);
					return resolvedFullPath;
				}
			}

			debug(
				`[inMemoryPlugin.resolveId] Failed to resolve '${id}' (resolvedImportPath: ${resolvedImportPath}) in processedFiles. Returning null.`,
			);
			return null;
		},
		load(id: string) {
			debug(`[inMemoryPlugin.load] Attempting to load module with ID: '${id}'`);

			const isEntryPoint = id === entryPointId;
			if (isEntryPoint) {
				debug(
					`[inMemoryPlugin.load] Loading content for special entry point '${id}' (first 100 chars):`,
					mdxBody.substring(0, 100),
				);
				return mdxBody;
			}

			const isInMemoryFile = Object.prototype.hasOwnProperty.call(
				processedFiles,
				id,
			);

			if (isInMemoryFile) {
				debug(
					`[inMemoryPlugin.load] Loading content for in-memory file '${id}' from processedFiles (first 100 chars):`,
					processedFiles[id].substring(0, 100),
				);
				return processedFiles[id];
			}

			debug(
				`[inMemoryPlugin.load] Module ID '${id}' not found in processedFiles or as entry point. The rolldown-mdx in-memory plugin will not load it.`,
			);
			return null;
		},
	};

	let mdxOpts: MdxPluginOptions = {
		remarkPlugins: [remarkFrontmatter, remarkMdxFrontmatter],
		rehypePlugins: [],
		jsx: false,
		jsxRuntime: "automatic",
		jsxImportSource: jsxConfig?.jsxLib?.package,
	};

	if (mdxOptionsFn) {
		mdxOpts = { ...mdxOpts, ...mdxOptionsFn(mdxOpts, frontmatter) };
	}
	debug("[bundleMDX] Final MDX Plugin Options:", mdxOpts);

	const jsxOpts: InputOptions["jsx"] = {
		mode: "automatic",
		jsxImportSource: jsxConfig?.jsxLib?.package,
	};

	// Create the imports transformation plugin
	const createImportsTransformPlugin = (
		jsxConfig: MdxJsxConfig,
		globals: Record<string, string>,
	) => ({
		name: "transform-imports-for-eval",
		renderChunk(code: string) {
			try {
				// Parse code to AST
				const result = parseSync("virtual.js", code, {
					sourceType: "module",
				});

				if (result.errors.length > 0) {
					console.warn(
						"Parsing errors in transform-imports plugin:",
						result.errors,
					);
				}

				const ast = result.program;

				// First, we'll process import declarations
				const imports: Array<{ source: string; specifiers: string[] }> = [];
				const bodyWithoutImports = ast.body.filter((node) => {
					// If it's an import declaration, save its information and remove it
					if (
						typeof node.type === "string" &&
						node.type === "ImportDeclaration"
					) {
						// We need to use type casting since we're working with AST nodes
						const importNode = node as {
							source: { value: string };
							specifiers?: Array<{
								local?: { name: string };
								imported?: { name: string };
							}>;
						};

						// Save import information for both global and non-global imports
						const source = String(importNode.source.value);
						// Extract imported names
						const specifiers = (importNode.specifiers || []).map(
							(spec) => spec.local?.name || spec.imported?.name || "default",
						);
						if (specifiers.length > 0) {
							imports.push({ source, specifiers });
						}

						return false; // Remove this node
					}
					return true; // Keep other nodes
				});

				// Now transform exports to return statement
				let exportsStatement = "";
				let hasExports = false;

				// Final body without exports
				const bodyWithoutExports = bodyWithoutImports.filter((node) => {
					if (typeof node.type === "string" && node.type.includes("Export")) {
						hasExports = true;
						return false; // Remove export nodes
					}
					return true; // Keep other nodes
				});

				// Add a return statement at the end to handle MDXContent
				exportsStatement = `return {
  default: typeof MDXContent !== 'undefined' ? MDXContent : null,
  frontmatter: typeof frontmatter !== 'undefined' ? frontmatter : {}
};`;

				// Rebuild AST without imports and with exports
				const modifiedAst = {
					...ast,
					body: bodyWithoutExports,
				};

				// Generate code without imports and exports
				let processedCode = generate(modifiedAst);

				// Instead of trying to do dynamic imports inside the function,
				// we'll build references to the global scope variables that
				// should be passed in when evaluating the code
				let globalReferences = "";

				// Add global references for external imports
				for (const imp of imports) {
					// For imports like '@builder.io/qwik', we need to extract symbols like
					// componentQrl, inlinedQrlDEV, etc. from the scope globals
					if (Object.keys(globals).includes(imp.source)) {
						for (const specifier of imp.specifiers) {
							globalReferences += `const ${specifier} = ${globals[imp.source]}.${specifier};\n`;
						}
					}
				}

				// Add the transformed code with appropriate globals
				processedCode = `${globalReferences}${processedCode}\n${exportsStatement}`;

				return {
					code: processedCode,
					map: null,
				};
			} catch (error) {
				console.error("Error transforming imports:", error);
				return null;
			}
		},
	});

	const transformImportsPlugin = createImportsTransformPlugin(
		jsxConfig,
		globals,
	);

	const inputOpts: InputOptions = {
		input: entryPointId,
		plugins: [
			inMemoryPlugin,
			mdx(mdxOpts),
			qwikRollup({
				entryStrategy: { type: "inline" },
			}),
			transformImportsPlugin,
		],
		external: Object.keys(globals),
		jsx: jsxConfig?.jsxLib?.package ? jsxOpts : undefined,
	};
	debug(
		"[bundleMDX] Rolldown Input Options:",
		JSON.stringify(inputOpts, null, 2),
	);

	const outputOpts: OutputOptions = {
		format: "esm",
		name: "__MDX_CONTENT__",
		globals: globals,
		exports: "named",
		sourcemap: false,
		inlineDynamicImports: false,
	};
	debug("[bundleMDX] Rolldown Output Options:", outputOpts);

	let bundledCode = "";
	const errors: Error[] = [];
	const warnings: Error[] = [];

	try {
		debug("[bundleMDX] Calling rolldown(inputOpts)...");
		const bundle = await rolldown(inputOpts);
		debug(
			"[bundleMDX] Rolldown build successful. Bundle object (keys):",
			Object.keys(bundle),
		);

		debug("[bundleMDX] Calling bundle.write(outputOpts)...");
		const { output } = await bundle.write(outputOpts);
		debug(
			"[bundleMDX] Rolldown write successful. Output (length):",
			output.length,
		);

		if (output.length > 0 && output[0].type === "chunk") {
			bundledCode = output[0].code;
			debug("[bundleMDX] Full Bundled code:", bundledCode);
		} else {
			console.error(
				"[bundleMDX] No chunk generated by Rolldown or unexpected output type.",
			);
			throw new Error(
				"No chunk generated by Rolldown or unexpected output type",
			);
		}
	} catch (error: unknown) {
		console.error("[bundleMDX] Error during Rolldown bundling/writing:", error);
		if (error instanceof Error) {
			errors.push(error);
		} else {
			errors.push(new Error(String(error)));
		}
	}

	const result: BundleMDXResult = {
		code: bundledCode,
		frontmatter,
		matter: mdxFileStructure,
		errors,
		warnings,
	};
	debug("[bundleMDX] Returning result:", {
		codeLength: result.code.length,
		frontmatter: result.frontmatter,
		errors: result.errors,
		warnings: result.warnings,
	});
	return result;
}
