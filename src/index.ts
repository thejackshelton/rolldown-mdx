import { rolldown, type InputOptions, type OutputOptions } from "rolldown";
import mdx from "@mdx-js/rollup";
import type { Options as MdxPluginOptions } from "@mdx-js/rollup";
import remarkFrontmatter from "remark-frontmatter";
import remarkMdxFrontmatter from "remark-mdx-frontmatter";
import { VFile } from "vfile";
import matter from "gray-matter";
import { resolve, dirname, extname, relative as relativePath } from "pathe";

export interface MdxJsxConfig {
	jsxLib?: {
		varName?: string;
		package?: string;
	};
	jsxRuntime?: {
		varName?: string;
		package?: string;
	};
	// jsxDom might be needed for some runtimes, but less common for MDX plugin
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
	// Rolldown specific options can be added here if needed
	// For now, we'll derive them or use sensible defaults.
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

	const entryPointId = "entry.mdx"; // Standard virtual module name
	let vfile: VFile;

	if (typeof source === "string") {
		vfile = new VFile({
			value: source,
			path: resolve(cwd, "source.mdx"), // Conceptual path for VFile
		});
	} else {
		vfile = source;
		if (!vfile.path) {
			vfile.path = resolve(cwd, "source.mdx");
		}
	}

	// Extract frontmatter using gray-matter directly
	const {
		data: frontmatterData,
		content: mdxContentAfterFrontmatter,
		...restOfMatter
	} = matter(String(vfile.value));
	const frontmatter = frontmatterData || {};
	console.log("[bundleMDX] Extracted frontmatter:", frontmatter);
	console.log(
		"[bundleMDX] MDX content after frontmatter (first 100 chars):",
		mdxContentAfterFrontmatter.substring(0, 100),
	);

	vfile.value = mdxContentAfterFrontmatter; // Update vfile content to be without frontmatter for MDX plugin
	// Store the full matter object if needed, similar to how vfile-matter might have attached it
	// Or decide if only frontmatter and the stripped content are needed moving forward.
	// For compatibility with existing structure, let's keep a similar shape for `bundleMDX` return.
	const matterObject = {
		data: frontmatter,
		content: mdxContentAfterFrontmatter,
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
					mdxContentAfterFrontmatter.substring(0, 100),
				);
				return mdxContentAfterFrontmatter; // Provide the MDX content for the entry point
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

	let mdxPluginOpts: MdxPluginOptions = {
		remarkPlugins: [remarkFrontmatter, remarkMdxFrontmatter],
		rehypePlugins: [],
		jsx: false, // MDX plugin should output JS function calls
		jsxRuntime: "automatic", // MDX v3 prefers automatic runtime
		// MDX plugin will append '/jsx-runtime' to this value.
		// So, provide the base package path for Qwik's actual JSX runtime.
		jsxImportSource: jsxConfig?.jsxLib?.package, // Results in import from '@builder.io/qwik/jsx-runtime'
		// pragma & pragmaFrag are deprecated in MDX v3 and were causing issues.
		// providerImportSource: jsxConfig?.jsxLib?.package, // If MDXProvider is used
	};

	if (mdxOptionsFn) {
		mdxPluginOpts = mdxOptionsFn(mdxPluginOpts, frontmatter);
	}
	console.log("[bundleMDX] Final MDX Plugin Options:", mdxPluginOpts);

	const inputOpts: InputOptions = {
		input: entryPointId, // Input is the virtual MDX entry
		plugins: [inMemoryPlugin, mdx(mdxPluginOpts)],
		external: Object.keys(globals),
		// Rolldown handles JSX in .tsx files (like demo.tsx) using Qwik's automatic runtime
		jsx: jsxConfig?.jsxLib?.package // If jsxLib is configured, assume we want Qwik JSX processing
			? {
					mode: "automatic",
					// Rolldown's transform (like MDX plugin) will append '/jsx-runtime' to this.
					jsxImportSource: jsxConfig.jsxLib.package, // e.g., '@builder.io/qwik' -> imports from '@builder.io/qwik/jsx-runtime'
					// factory/fragment are not typically needed for automatic mode if jsxImportSource is correctly resolved.
				}
			: undefined,
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
		// console.log('[bundleMDX] Rolldown bundle warnings:', bundle.warnings); // If Rolldown exposes warnings this way

		console.log("[bundleMDX] Calling bundle.write(outputOpts)...");
		const { output } = await bundle.write(outputOpts);
		console.log(
			"[bundleMDX] Rolldown write successful. Output (length):",
			output.length,
		);

		if (output.length > 0 && output[0].type === "chunk") {
			bundledCode = output[0].code;
			console.log("[bundleMDX] Full Bundled code:", bundledCode);
			// if (output[0].map) { /* handle sourcemap if needed */ }
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
		// Rolldown might throw an error object that contains more details
		// or might be a string. We'll capture it.
		if (error instanceof Error) {
			errors.push(error);
		} else {
			errors.push(new Error(String(error)));
		}
		// For now, rethrow or handle as per mdx-bundler's error reporting
		// console.error("Rolldown bundling error:", error);
		// throw error; // Or return it in the result
	}

	const result: BundleMDXResult = {
		code: bundledCode,
		frontmatter,
		matter: matterObject, // Return the object from gray-matter
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
