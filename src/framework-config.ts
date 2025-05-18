/**
 * Framework configuration map for automatic setup
 */

import type { MdxJsxConfig as BaseMdxJsxConfig } from "./index";

/**
 * Frameworks that we support out of the box
 */
export type SupportedFramework =
	| "react"
	| "preact"
	| "solid"
	| "vue"
	| "qwik"
	| "hono";

/**
 * Framework import type (allows any properties)
 */
export interface FrameworkImport {
	// We don't need the specific JSX function types anymore since we're using string-based detection
	[key: string]: unknown;
}

/**
 * Defines which keys on the frameworkImport provide the jsx, jsxs, and Fragment functions.
 * Can be a single string (key name) or an array of strings (fallback key names).
 */
export interface JsxImportKeys {
	jsx?: string | string[];
	jsxs?: string | string[];
	Fragment?: string;
}

/**
 * Extended MdxJsxConfig with keys for accessing JSX functions on the framework import.
 */
export interface MdxJsxConfig extends BaseMdxJsxConfig {
	jsxImportKeys?: JsxImportKeys;
}

/**
 * Configuration map for each supported framework
 */
export const frameworkConfigs: Record<SupportedFramework, MdxJsxConfig> = {
	react: {
		jsxLib: { package: "react", varName: "React" },
		jsxRuntime: { package: "react/jsx-runtime", varName: "_jsx" },
		jsxImportKeys: {
			jsx: ["jsx", "createElement"],
			jsxs: ["jsxs", "jsx", "createElement"],
			Fragment: "Fragment",
		},
	},
	preact: {
		jsxLib: { package: "preact", varName: "Preact" },
		jsxRuntime: { package: "preact/jsx-runtime", varName: "_jsx_runtime" },
		jsxDom: { package: "preact/compat", varName: "PreactDOM" },
		jsxImportKeys: {
			jsx: ["jsx", "createElement"],
			jsxs: ["jsxs", "jsx", "createElement"],
			Fragment: "Fragment",
		},
	},
	solid: {
		jsxLib: { package: "solid-js", varName: "Solid" },
		jsxRuntime: { package: "solid-js/jsx-runtime", varName: "_jsx" },
		jsxImportKeys: {
			jsx: "jsx",
			jsxs: "jsxs",
			Fragment: "Fragment",
		},
	},
	vue: {
		jsxLib: { package: "vue", varName: "Vue" },
		jsxRuntime: { package: "vue/jsx-runtime", varName: "_jsx_runtime" },
		jsxImportKeys: {
			jsx: "jsx",
			jsxs: "jsxs",
			Fragment: "Fragment",
		},
	},
	qwik: {
		jsxLib: { package: "@builder.io/qwik", varName: "Qwik" },
		jsxRuntime: {
			package: "@builder.io/qwik/jsx-runtime",
			varName: "_jsx_runtime",
		},
		jsxImportKeys: {
			jsx: "jsx",
			jsxs: "jsx",
			Fragment: "Fragment",
		},
	},
	hono: {
		jsxLib: { package: "hono/jsx", varName: "Hono" },
		jsxRuntime: { package: "hono/jsx/jsx-runtime", varName: "_jsx_runtime" },
		jsxDom: { package: "hono/jsx/dom", varName: "HonoDOM" },
		jsxImportKeys: {
			jsx: "jsx",
			jsxs: "jsxs",
			Fragment: "Fragment",
		},
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
