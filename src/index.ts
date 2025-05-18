import mdx from "@mdx-js/rollup";
import type { Options as MdxPluginOptions } from "@mdx-js/rollup";
import matter from "gray-matter";
import { resolve } from "pathe";
import remarkFrontmatter from "remark-frontmatter";
import remarkMdxFrontmatter from "remark-mdx-frontmatter";
import {
	type InputOptions,
	type OutputOptions,
	type RolldownPluginOption,
	rolldown,
} from "rolldown";
import { VFile } from "vfile";
import {
	type FrameworkImport,
	type MdxJsxConfig as FrameworkMdxJsxConfig,
	type SupportedFramework,
	deriveGlobals,
	getFrameworkConfig,
} from "./framework-config";
import { createInMemoryPlugin } from "./plugins/memory";
import { createImportsTransformPlugin } from "./plugins/transform";

export type { SupportedFramework, FrameworkImport };
export { getFrameworkConfig };

export interface BundleMDXResult {
	code: string;
	frontmatter: Record<string, unknown>;
	matter: ReturnType<typeof matter>;
	errors: Error[];
	warnings: Error[];
	/**
	 * Framework information if a framework was specified
	 */
	framework?: {
		/** The framework that was used */
		name: SupportedFramework;
		/** Example code for using the MDX component */
		example: string;
	};
	/**
	 * JSX configuration used to build the MDX
	 * This is included even when no framework is specified
	 */
	jsxConfig?: MdxJsxConfig;
}

import { createMDXComponent, getFrameworkRuntime } from "./jsx";

export { createMDXComponent, getFrameworkRuntime };

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
	/** Global mappings for external packages. Auto-derived with framework */
	globals?: Record<string, string>;
	/** Framework for auto JSX config and globals, you MAY still need to pass in rolldown config for your framework (compiler, etc.) */
	framework?: SupportedFramework;
	/** Custom JSX config, rarely needed with framework */
	jsxConfig?: MdxJsxConfig;
	resolveExtensions?: string[];
	debug?: boolean;
	/** Rolldown input options */
	rolldown?: Omit<InputOptions, "input">;
	/** Rolldown output options */
	output?: OutputOptions;
}

export async function bundleMDX({
	source,
	files = {},
	cwd = process.cwd(),
	mdxOptions: mdxOptionsFn,
	globals = {},
	framework,
	jsxConfig: userJsxConfig = {},
	resolveExtensions = [".tsx", ".ts", ".jsx", ".js", ".mdx", ".json"],
	debug: isDebugMode = false,
	rolldown: rolldownOpts = {},
	output: outputOpts = {},
}: BundleMDXOptions): Promise<BundleMDXResult> {
	const debug = (...args: unknown[]) => {
		if (isDebugMode) {
			console.log(...args);
		}
	};

	let activeJsxConfig: FrameworkMdxJsxConfig = { ...userJsxConfig };
	let mergedGlobals = { ...globals };

	if (framework) {
		const frameworkConfigFromFile = getFrameworkConfig(framework);
		const frameworkGlobals = deriveGlobals(frameworkConfigFromFile);
		activeJsxConfig = {
			...frameworkConfigFromFile,
			jsxLib: { ...frameworkConfigFromFile.jsxLib, ...userJsxConfig.jsxLib },
			jsxRuntime: {
				...frameworkConfigFromFile.jsxRuntime,
				...userJsxConfig.jsxRuntime,
			},
			jsxDom: { ...frameworkConfigFromFile.jsxDom, ...userJsxConfig.jsxDom },
		};
		mergedGlobals = { ...frameworkGlobals, ...globals };
	} else if (Object.keys(userJsxConfig).length > 0) {
		const customGlobals = deriveGlobals(userJsxConfig);
		mergedGlobals = { ...customGlobals, ...globals };
	}

	debug("[bundleMDX] Initial options:", {
		source: typeof source === "string" ? "string" : "VFile",
		files: Object.keys(files),
		cwd,
		hasMdxOptionsFn: !!mdxOptionsFn,
		globals: mergedGlobals,
		framework,
		jsxConfig: activeJsxConfig,
		resolveExtensions,
		debug,
		rolldownOpts,
		outputOpts,
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

	let mdxOpts: MdxPluginOptions = {
		remarkPlugins: [remarkFrontmatter, remarkMdxFrontmatter],
		rehypePlugins: [],
		jsx: false,
		jsxRuntime: "automatic",
		jsxImportSource: activeJsxConfig?.jsxLib?.package,
	};

	if (mdxOptionsFn) {
		mdxOpts = { ...mdxOpts, ...mdxOptionsFn(mdxOpts, frontmatter) };
	}
	debug("[bundleMDX] Final MDX Plugin Options:", mdxOpts);

	const jsxOpts: InputOptions["jsx"] = {
		mode: "automatic",
		jsxImportSource: activeJsxConfig?.jsxLib?.package,
	};

	const inMemoryPlugin = createInMemoryPlugin({
		entryPointId,
		processedFiles,
		vfile,
		cwd,
		resolveExtensions,
		debug,
	});

	const transformImportsPlugin = createImportsTransformPlugin(mergedGlobals);

	const defaultPlugins = [inMemoryPlugin, mdx(mdxOpts), transformImportsPlugin];

	const inputOpts: InputOptions = {
		input: entryPointId,
		plugins: defaultPlugins,
		external: Object.keys(mergedGlobals),
		jsx: activeJsxConfig?.jsxLib?.package ? jsxOpts : undefined,
		...rolldownOpts,
	};

	if (rolldownOpts.plugins) {
		let userPlugins: RolldownPluginOption[] = [];

		if (Array.isArray(rolldownOpts.plugins)) {
			userPlugins = rolldownOpts.plugins;
		} else {
			userPlugins = [rolldownOpts.plugins];
		}

		inputOpts.plugins = [...defaultPlugins, ...userPlugins];
	}

	if (rolldownOpts.external) {
		const userExternals = rolldownOpts.external;

		if (Array.isArray(userExternals)) {
			inputOpts.external = [...Object.keys(mergedGlobals), ...userExternals];
		} else {
			inputOpts.external = userExternals;
		}
	}

	debug(
		"[bundleMDX] Rolldown Input Options:",
		JSON.stringify(inputOpts, null, 2),
	);

	const defaultOutputOpts: OutputOptions = {
		format: "esm",
		name: "__MDX_CONTENT__",
		globals: mergedGlobals,
		exports: "named",
		sourcemap: false,
		inlineDynamicImports: false,
	};

	const mergedOutputOpts: OutputOptions = {
		...defaultOutputOpts,
		...outputOpts,
	};

	debug("[bundleMDX] Rolldown Output Options:", mergedOutputOpts);

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
		const { output } = await bundle.write(mergedOutputOpts);
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
		jsxConfig: activeJsxConfig,
	};

	if (framework) {
		result.framework = {
			name: framework,
			example: `
import { createMDXComponent } from 'rolldown-mdx';
import * as ${activeJsxConfig.jsxLib?.varName || "Framework"} from '${activeJsxConfig.jsxLib?.package || framework}';

// Framework is auto-detected!
const Component = createMDXComponent(result, ${activeJsxConfig.jsxLib?.varName || "Framework"});
`,
		};
	}

	return result;
}
