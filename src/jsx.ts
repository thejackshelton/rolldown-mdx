/**
 * @module jsx
 * These generics help tame the types to your framework when you consume the component/exports:
 *
 * `getMDXComponent<P, R, T>`:
 *  - `P`: Your component's props.
 *  - `R`: Its return type (e.g., `JSX.Element`). Defaults `unknown` for safety – you make it specific for your JSX lib.
 *  - `T`: The full component signature `(props: P) => R`.
 *
 * `getMDXExport<ExportedObject>`:
 *  - `ExportedObject`: Defines the shape of all MDX exports (component, frontmatter, etc.).
 */

import {
	type FrameworkImport,
	type SupportedFramework,
	frameworkConfigs,
} from "./framework-config";
import type { BundleMDXResult } from "./index";

/**
 * Creates a component from the bundled MDX code.
 * @template P The props type for the MDX component.
 * @template R The return type of the MDX component.
 * @param {string} code - The bundled MDX code string.
 * @param {Record<string, unknown>} scope - Object containing components and variables needed by the MDX.
 * @return {(props: P) => R} The MDX component.
 */
function getMDXComponent<P = Record<string, unknown>, R = unknown>(
	code: string,
	scope: Record<string, unknown> = {},
): (props: P) => R {
	const mdxExport = getMDXExport<{ default: (props: P) => R }>(code, scope);
	return mdxExport.default;
}

/**
 * Executes the bundled MDX code and returns all its exports.
 * @template ExportedObject The type of the exported object.
 * @param {string} code - The bundled MDX code string.
 * @param {Record<string, unknown>} scope - Object containing components and variables needed by the MDX.
 * @return {ExportedObject} The MDX module exports.
 */
function getMDXExport<ExportedObject = Record<string, unknown>>(
	code: string,
	scope: Record<string, unknown> = {},
): ExportedObject {
	// Ensure commonly needed runtime objects are available
	const safeScope = { ...scope };

	// Check if code references _jsx_runtime but it's not in scope
	if (code.includes("_jsx_runtime") && !safeScope._jsx_runtime) {
		safeScope._jsx_runtime = {
			jsx: (type: unknown, props: Record<string, unknown>) => ({ type, props }),
			jsxs: (type: unknown, props: Record<string, unknown>) => ({
				type,
				props,
			}),
			Fragment: Symbol("Fragment"),
		};
	}

	const fn = new Function(...Object.keys(safeScope), code);
	return fn(...Object.values(safeScope));
}

/**
 * Get JSX runtime configuration for component creation
 */
export function getFrameworkRuntime(
	framework: SupportedFramework,
	frameworkImport: FrameworkImport,
): Record<string, unknown> {
	const jsxConfig = frameworkConfigs[framework];

	switch (framework) {
		case "react":
		case "preact": {
			const varName = jsxConfig.jsxLib?.varName || "React";
			return {
				[varName]: frameworkImport,
				_jsx: {
					jsx: frameworkImport.jsx || frameworkImport.createElement,
					jsxs:
						frameworkImport.jsxs ||
						frameworkImport.jsx ||
						frameworkImport.createElement,
					Fragment: frameworkImport.Fragment,
				},
			};
		}

		case "qwik": {
			return {
				Qwik: frameworkImport,
				_jsx_runtime: {
					jsx: frameworkImport.jsx,
					jsxs: frameworkImport.jsx,
					Fragment: frameworkImport.Fragment,
				},
			};
		}

		default: {
			const mainLib = jsxConfig.jsxLib?.varName || "Framework";
			const runtimeName = jsxConfig.jsxRuntime?.varName || "_jsx_runtime";

			const defaultJsx = (
				tag: unknown,
				props: unknown,
			): { tag: unknown; props: unknown } => ({ tag, props });

			const result: Record<string, unknown> = {
				[mainLib]: frameworkImport,
			};

			result[runtimeName] = {
				jsx: frameworkImport.jsx || frameworkImport.createElement || defaultJsx,
				jsxs:
					frameworkImport.jsxs ||
					frameworkImport.jsx ||
					frameworkImport.createElement ||
					defaultJsx,
				Fragment: frameworkImport.Fragment || Symbol("Fragment"),
			};

			return result;
		}
	}
}

/**
 * Creates an MDX component with auto-detected framework runtime
 *
 * @example
 * import { bundleMDX, createMDXComponent } from 'rolldown-mdx';
 * import * as React from 'react';
 *
 * const result = await bundleMDX({
 *   source: source,
 *   framework: 'react'
 * });
 *
 * // Pass the bundler result and framework import
 * const Component = createMDXComponent(result, React);
 *
 * @param bundlerResult - The bundled MDX result or code string
 * @param frameworkImport - The imported framework module (e.g., React, Qwik)
 * @param framework - Optional framework name (if auto-detection should be overridden)
 * @returns The MDX component
 */
export function createMDXComponent<
	Props = Record<string, unknown>,
	Output = unknown,
>(
	bundlerResult: BundleMDXResult | string,
	frameworkImport: FrameworkImport,
	framework?: SupportedFramework,
): (props: Props) => Output {
	const code =
		typeof bundlerResult === "string" ? bundlerResult : bundlerResult.code;

	// First priority: explicit framework parameter
	if (framework) {
		const runtime = getFrameworkRuntime(framework, frameworkImport);
		return getMDXComponent<Props, Output>(code, runtime);
	}

	// Second priority: framework from bundler result
	if (typeof bundlerResult !== "string") {
		// Check for framework info
		if (bundlerResult.framework?.name) {
			const runtime = getFrameworkRuntime(
				bundlerResult.framework.name,
				frameworkImport,
			);
			return getMDXComponent<Props, Output>(code, runtime);
		}

		// Check for custom jsxConfig
		if (bundlerResult.jsxConfig) {
			// If jsxConfig exists but no framework, set up a generic runtime
			const runtime = {
				// Use the library name from config if available
				[bundlerResult.jsxConfig.jsxLib?.varName || "JSXLibrary"]:
					frameworkImport,
			};

			// Set up JSX runtime based on config
			if (bundlerResult.jsxConfig.jsxRuntime?.varName) {
				runtime[bundlerResult.jsxConfig.jsxRuntime.varName] = {
					jsx: frameworkImport.jsx || frameworkImport.createElement,
					jsxs:
						frameworkImport.jsxs ||
						frameworkImport.jsx ||
						frameworkImport.createElement,
					Fragment: frameworkImport.Fragment || Symbol("Fragment"),
				};
			}

			return getMDXComponent<Props, Output>(code, runtime);
		}
	}

	const frameworkStr = Object.prototype.toString
		.call(frameworkImport)
		.toLowerCase();

	const frameworkMap: Record<SupportedFramework, string> = {
		qwik: "qwik",
		react: "react",
		preact: "preact",
		solid: "solid",
		vue: "vue",
		hono: "hono",
		svelte: "svelte",
	};

	for (const [fw, identifier] of Object.entries(frameworkMap) as [
		SupportedFramework,
		string,
	][]) {
		if (frameworkStr.includes(identifier)) {
			return getMDXComponent<Props, Output>(
				code,
				getFrameworkRuntime(fw, frameworkImport),
			);
		}
	}

	// Last resort: default to React
	return getMDXComponent<Props, Output>(
		code,
		getFrameworkRuntime("react", frameworkImport),
	);
}

export { getMDXComponent, getMDXExport };
