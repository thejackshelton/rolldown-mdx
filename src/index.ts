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
	const entryFileName = "entry.mdx";
	let vfile: VFile;

	if (typeof source === "string") {
		vfile = new VFile({
			value: source,
			path: resolve(cwd, entryFileName),
		});
	} else {
		vfile = source;
		if (!vfile.path) {
			vfile.path = resolve(cwd, entryFileName);
		}
	}

	// Extract frontmatter using gray-matter directly
	const {
		data: frontmatterData,
		content: mdxContentAfterFrontmatter,
		...restOfMatter
	} = matter(String(vfile.value));
	const frontmatter = frontmatterData || {};
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
			if (id === entryFileName || id === `./${entryFileName}`) {
				return entryFileName;
			}
			if (importer) {
				const importerDir = dirname(
					importer === entryFileName ? vfile.path : importer,
				);
				let resolved = resolve(importerDir, id);
				if (!extname(resolved) && files[`${resolved}.tsx`]) {
					resolved = `${resolved}.tsx`;
				} else if (!extname(resolved) && files[`${resolved}.ts`]) {
					resolved = `${resolved}.ts`;
				} else if (!extname(resolved) && files[`${resolved}.js`]) {
					resolved = `${resolved}.js`;
				} else if (!extname(resolved) && files[`${resolved}.jsx`]) {
					resolved = `${resolved}.jsx`;
				} else if (!extname(resolved) && files[`${resolved}.mdx`]) {
					resolved = `${resolved}.mdx`;
				}

				const relative = `./${relativePath(cwd, resolved).replace(/^\\.\\\\/, "")}`;

				if (files[relative]) {
					return relative;
				}
				// Handle node_modules like imports from files map
				if (files[id]) {
					return id;
				}
			}
			if (files[id]) {
				return id;
			}
			return null;
		},
		load(id: string) {
			if (id === entryFileName) {
				return String(vfile.value);
			}
			if (files[id]) {
				return files[id];
			}
			return null;
		},
	};

	let mdxPluginOpts: MdxPluginOptions = {
		remarkPlugins: [remarkFrontmatter, remarkMdxFrontmatter],
		rehypePlugins: [],
		jsx: jsxConfig?.jsxRuntime?.package ? true : undefined, // true enables automatic runtime usually
		jsxImportSource: jsxConfig?.jsxRuntime?.package,
		// jsxRuntime: 'automatic', // Usually default with jsxImportSource
		providerImportSource: jsxConfig?.jsxLib?.package,
	};

	if (mdxOptionsFn) {
		mdxPluginOpts = mdxOptionsFn(mdxPluginOpts, frontmatter);
	}

	const inputOpts: InputOptions = {
		input: entryFileName,
		plugins: [inMemoryPlugin, mdx(mdxPluginOpts)],
		external: Object.keys(globals),
		// We might need to configure Rolldown's internal JSX/TS transforms
		// if @mdx-js/rollup doesn't fully handle dependencies.
		// For now, relying on @mdx-js/rollup to process MDX and its JS/TS imports.
	};

	const outputOpts: OutputOptions = {
		format: "esm",
		globals: globals,
		sourcemap: false, // Keep it simple for now
	};

	let bundledCode = "";
	const errors: Error[] = [];
	const warnings: Error[] = [];

	try {
		const bundle = await rolldown(inputOpts);

		// Capture warnings from the build
		// Rolldown's API for warnings/errors might differ from esbuild.
		// This is a placeholder based on typical bundler patterns.
		// if (bundle.warnings) warnings.push(...bundle.warnings.map(w => new Error(w.text)));

		const { output } = await bundle.write(outputOpts);
		if (output.length > 0 && output[0].type === "chunk") {
			bundledCode = output[0].code;
			// if (output[0].map) { /* handle sourcemap if needed */ }
		} else {
			throw new Error("No chunk generated by Rolldown");
		}
	} catch (error: unknown) {
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

	return {
		code: bundledCode,
		frontmatter,
		matter: matterObject, // Return the object from gray-matter
		errors,
		warnings,
	};
}
