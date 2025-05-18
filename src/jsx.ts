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
	type MdxJsxConfig,
	type SupportedFramework,
	frameworkConfigs,
} from "./framework-config";
import type { BundleMDXResult } from "./index";

/**
 * Internal: Creates a component from the bundled MDX code with a pre-configured scope.
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
 * Internal: Executes the bundled MDX code and returns all its exports with a pre-configured scope.
 * @template ExportedObject The type of the exported object.
 * @param {string} code - The bundled MDX code string.
 * @param {Record<string, unknown>} scope - Object containing components and variables needed by the MDX.
 * @return {ExportedObject} The MDX module exports.
 */
function getMDXExport<ExportedObject = Record<string, unknown>>(
	code: string,
	scope: Record<string, unknown> = {},
): ExportedObject {
	const fn = new Function(...Object.keys(scope), code);
	return fn(...Object.values(scope));
}

/**
 * Builds JSX runtime scope. (Advanced).
 * @param configInput Framework name or MdxJsxConfig.
 * @param frameworkImport Imported framework module.
 * @returns MDX component runtime scope.
 */
export function getFrameworkRuntime(
	configInput: SupportedFramework | MdxJsxConfig,
	frameworkImport: FrameworkImport,
): Record<string, unknown> {
	const resolvedConfig: MdxJsxConfig =
		typeof configInput === "string"
			? frameworkConfigs[configInput]
			: configInput;

	const scope: Record<string, unknown> = {};

	const mainLibVarName = resolvedConfig.jsxLib?.varName;
	if (mainLibVarName) {
		scope[mainLibVarName] = frameworkImport;
	}

	const resolveJsxImportKey = (
		keys?: string | string[],
		fallback?: unknown,
	) => {
		if (!keys) return fallback;
		const keyArray = Array.isArray(keys) ? keys : [keys];
		for (const key of keyArray) {
			if (key in frameworkImport && frameworkImport[key] !== undefined) {
				return frameworkImport[key];
			}
		}
		return fallback;
	};

	const placeholderJsx = (
		tag: unknown,
		props: unknown,
	): { tag: unknown; props: unknown } => ({ tag, props });

	if (resolvedConfig.jsxRuntime?.varName) {
		const importKeys = resolvedConfig.jsxImportKeys || {};

		const jsx = resolveJsxImportKey(importKeys.jsx, placeholderJsx);
		const jsxs = resolveJsxImportKey(importKeys.jsxs, jsx);
		const Fragment = resolveJsxImportKey(
			importKeys.Fragment,
			Symbol("Fragment"),
		);

		scope[resolvedConfig.jsxRuntime.varName] = {
			jsx,
			jsxs,
			Fragment,
		};
	}

	return scope;
}

/**
 * Creates MDX component from bundled code.
 * @param bundlerResult BundleMDXResult or code string.
 * @param frameworkImport Imported framework module.
 * @param explicitFramework Optional. Overrides auto-detected framework.
 * @returns Executable MDX component.
 */
export function createMDXComponent<
	Props = Record<string, unknown>,
	Output = unknown,
>(
	bundlerResult: BundleMDXResult | string,
	frameworkImport: FrameworkImport,
	explicitFramework?: SupportedFramework,
): (props: Props) => Output {
	const code =
		typeof bundlerResult === "string" ? bundlerResult : bundlerResult.code;

	if (explicitFramework) {
		return getMDXComponent<Props, Output>(
			code,
			getFrameworkRuntime(explicitFramework, frameworkImport),
		);
	}

	const isBundlerResultObject = typeof bundlerResult !== "string";
	if (isBundlerResultObject) {
		if (bundlerResult.framework?.name) {
			return getMDXComponent<Props, Output>(
				code,
				getFrameworkRuntime(bundlerResult.framework.name, frameworkImport),
			);
		}
		if (bundlerResult.jsxConfig) {
			return getMDXComponent<Props, Output>(
				code,
				getFrameworkRuntime(bundlerResult.jsxConfig, frameworkImport),
			);
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

	return getMDXComponent<Props, Output>(
		code,
		getFrameworkRuntime("react", frameworkImport),
	);
}
