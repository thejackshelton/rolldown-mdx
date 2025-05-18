import { rolldown, type InputOptions, type OutputOptions } from "rolldown";
import mdx from "@mdx-js/rollup";
import type { Options as MdxPluginOptions } from "@mdx-js/rollup";
import remarkFrontmatter from "remark-frontmatter";
import remarkMdxFrontmatter from "remark-mdx-frontmatter";
import { VFile } from "vfile";
import matter from "gray-matter";
import { resolve, dirname, extname } from "pathe";
import { qwikRollup } from "@builder.io/qwik/optimizer";

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

	const inputOpts: InputOptions = {
		input: entryPointId,
		plugins: [
			inMemoryPlugin,
			mdx(mdxOpts),
			qwikRollup({
				entryStrategy: { type: "inline" },
			}),
		],
		external: Object.keys(globals),
		jsx: jsxConfig?.jsxLib?.package ? jsxOpts : undefined,
	};
	debug(
		"[bundleMDX] Rolldown Input Options:",
		JSON.stringify(inputOpts, null, 2),
	);

	const outputOpts: OutputOptions = {
		format: "iife",
		name: "__MDX_CONTENT__",
		globals: globals,
		exports: "named",
		sourcemap: false,
		inlineDynamicImports: true,
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
