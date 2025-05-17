import { rolldown, type InputOptions, type OutputOptions } from "rolldown";
import mdx from "@mdx-js/rollup";
import type { Options as MdxPluginOptions } from "@mdx-js/rollup";
import remarkFrontmatter from "remark-frontmatter";
import remarkMdxFrontmatter from "remark-mdx-frontmatter";
import { VFile } from "vfile";
import matter from "gray-matter";
import { resolve, dirname, extname, relative as relativePath } from "pathe";
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
}: BundleMDXOptions): Promise<BundleMDXResult> {
	console.log("[bundleMDX] Initial options:", {
		source: typeof source === "string" ? "string" : "VFile",
		files: Object.keys(files),
		cwd,
		hasMdxOptionsFn: !!mdxOptionsFn,
		globals,
		jsxConfig,
	});
	if (typeof source === "string") {
		console.log(
			"[bundleMDX] Source string (first 100 chars):",
			source.substring(0, 100),
		);
	} else {
		console.log("[bundleMDX] Source VFile path:", source.path);
		console.log(
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
	console.log("[bundleMDX] Extracted frontmatter:", frontmatter);
	console.log(
		"[bundleMDX] MDX content after frontmatter (first 100 chars):",
		mdxBody.substring(0, 100),
	);

	vfile.value = mdxBody;

	const mdxFileStructure = {
		data: frontmatter,
		content: mdxBody,
		...restOfMatter,
	};

	const inMemoryPlugin = {
		name: "in-memory-loader",
		resolveId(id: string, importer?: string) {
			console.log(
				`[inMemoryPlugin.resolveId] Attempting to resolve: '${id}' from importer: '${importer}'`,
			);
			if (id === entryPointId || id === `./${entryPointId}`) {
				console.log(
					`[inMemoryPlugin.resolveId] Resolved '${id}' to entry point '${entryPointId}'`,
				);
				return entryPointId;
			}
			// Resolve other files from the 'files' map
			if (importer) {
				const baseDir =
					importer === entryPointId ? dirname(vfile.path) : dirname(importer);
				let resolvedPath = resolve(baseDir, id);

				// Attempt to match with extensions if not explicitly provided
				const extensions = [".tsx", ".ts", ".jsx", ".js", ".mdx", ".json"];
				if (!extname(resolvedPath)) {
					for (const ext of extensions) {
						if (files[`./${relativePath(cwd, resolvedPath + ext)}`]) {
							resolvedPath = resolvedPath + ext;
							break;
						}
						if (files[resolvedPath + ext]) {
							// for absolute-like paths in files keys
							resolvedPath = resolvedPath + ext;
							break;
						}
					}
				}

				const relativeKey = `./${relativePath(cwd, resolvedPath)}`;
				if (files[relativeKey]) {
					console.log(
						`[inMemoryPlugin.resolveId] Resolved '${id}' to relativeKey '${relativeKey}' from files map`,
					);
					return relativeKey;
				}
				if (files[resolvedPath]) {
					console.log(
						`[inMemoryPlugin.resolveId] Resolved '${id}' to resolvedPath '${resolvedPath}' from files map (absolute-like)`,
					);
					return resolvedPath;
				}
			}
			// Fallback for top-level entries in files map (e.g. node_modules)
			if (files[id]) {
				console.log(
					`[inMemoryPlugin.resolveId] Resolved '${id}' directly from files map (globals/node_modules)`,
				);
				return id;
			}
			console.log(`[inMemoryPlugin.resolveId] Failed to resolve '${id}'`);
			return null;
		},
		load(id: string) {
			console.log(`[inMemoryPlugin.load] Attempting to load: '${id}'`);
			if (id === entryPointId) {
				console.log(
					`[inMemoryPlugin.load] Loading content for entry point '${id}' (first 100 chars):`,
					mdxBody.substring(0, 100),
				);
				return mdxBody;
			}
			if (files[id]) {
				console.log(
					`[inMemoryPlugin.load] Loading content for '${id}' from files map (first 100 chars):`,
					files[id].substring(0, 100),
				);
				return files[id];
			}
			console.log(`[inMemoryPlugin.load] Failed to load '${id}'`);
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
		mdxOpts = mdxOptionsFn(mdxOpts, frontmatter);
	}
	console.log("[bundleMDX] Final MDX Plugin Options:", mdxOpts);

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
	console.log(
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
	console.log("[bundleMDX] Rolldown Output Options:", outputOpts);

	let bundledCode = "";
	const errors: Error[] = [];
	const warnings: Error[] = [];

	try {
		console.log("[bundleMDX] Calling rolldown(inputOpts)...");
		const bundle = await rolldown(inputOpts);
		console.log(
			"[bundleMDX] Rolldown build successful. Bundle object (keys):",
			Object.keys(bundle),
		);

		console.log("[bundleMDX] Calling bundle.write(outputOpts)...");
		const { output } = await bundle.write(outputOpts);
		console.log(
			"[bundleMDX] Rolldown write successful. Output (length):",
			output.length,
		);

		if (output.length > 0 && output[0].type === "chunk") {
			bundledCode = output[0].code;
			console.log("[bundleMDX] Full Bundled code:", bundledCode);
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
	console.log("[bundleMDX] Returning result:", {
		codeLength: result.code.length,
		frontmatter: result.frontmatter,
		errors: result.errors,
		warnings: result.warnings,
	});
	return result;
}
