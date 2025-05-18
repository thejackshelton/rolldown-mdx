/**
 * Framework configuration map for automatic setup
 */

import type { MdxJsxConfig } from "./index";

/**
 * Frameworks that we support out of the box
 */
export type SupportedFramework =
	| "react"
	| "preact"
	| "solid"
	| "vue"
	| "qwik"
	| "hono"
	| "svelte";

/**
 * Framework import type (allows any properties)
 */
export interface FrameworkImport {
	// We don't need the specific JSX function types anymore since we're using string-based detection
	[key: string]: unknown;
}

/**
 * Runtime configuration for JSX
 */
export interface JsxRuntimeConfig {
	jsx: (...args: unknown[]) => unknown;
	jsxs: (...args: unknown[]) => unknown;
	Fragment: unknown;
}

/**
 * Configuration map for each supported framework
 */
export const frameworkConfigs: Record<SupportedFramework, MdxJsxConfig> = {
	react: {
		jsxLib: { package: "react", varName: "React" },
		jsxRuntime: { package: "react/jsx-runtime", varName: "_jsx" },
	},
	preact: {
		jsxLib: { package: "preact", varName: "Preact" },
		jsxRuntime: { package: "preact/jsx-runtime", varName: "_jsx" },
	},
	solid: {
		jsxLib: { package: "solid-js", varName: "Solid" },
		jsxRuntime: { package: "solid-js/jsx-runtime", varName: "_jsx" },
	},
	vue: {
		jsxLib: { package: "vue", varName: "Vue" },
		jsxRuntime: { package: "vue/jsx-runtime", varName: "_jsx" },
	},
	qwik: {
		jsxLib: { package: "@builder.io/qwik", varName: "Qwik" },
		jsxRuntime: {
			package: "@builder.io/qwik/jsx-runtime",
			varName: "_jsx_runtime",
		},
	},
	hono: {
		jsxLib: { package: "hono/jsx", varName: "Hono" },
		jsxRuntime: { package: "hono/jsx/jsx-runtime", varName: "_jsx" },
		jsxDom: { package: "hono/jsx/dom", varName: "HonoDOM" },
	},
	svelte: {
		jsxLib: { package: "svelte", varName: "Svelte" },
		jsxRuntime: { package: "svelte/internal", varName: "_svelte" },
	},
};

/**
 * Get configuration for a specific framework
 */
export function getFrameworkConfig(
	framework: SupportedFramework,
): MdxJsxConfig {
	return frameworkConfigs[framework];
}

/**
 * Derive globals from jsxConfig
 */
export function deriveGlobals(jsxConfig: MdxJsxConfig): Record<string, string> {
	const globals: Record<string, string> = {};

	if (jsxConfig.jsxLib?.package && jsxConfig.jsxLib.varName) {
		globals[jsxConfig.jsxLib.package] = jsxConfig.jsxLib.varName;
	}

	if (jsxConfig.jsxRuntime?.package && jsxConfig.jsxRuntime.varName) {
		globals[jsxConfig.jsxRuntime.package] = jsxConfig.jsxRuntime.varName;
	}

	if (jsxConfig.jsxDom?.package && jsxConfig.jsxDom.varName) {
		globals[jsxConfig.jsxDom.package] = jsxConfig.jsxDom.varName;
	}

	return globals;
}
