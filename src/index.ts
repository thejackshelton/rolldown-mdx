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

	const createImportsTransformPlugin = (globals: Record<string, string>) => ({
		name: "transform-imports-for-eval",
		renderChunk(code: string) {
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
	});

	const transformImportsPlugin = createImportsTransformPlugin(globals);

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
