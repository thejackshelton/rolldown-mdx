// Define a generic type for a component function if JSX namespace is not globally available.
// Users of specific frameworks (React, Qwik, Solid) will have their own JSX.Element types.
// This client aims to be framework-agnostic in its type signature here.
type AnyComponent<Props = Record<string, unknown>> = (props: Props) => unknown; // More generic than JSX.Element

const IIFE_GLOBAL_NAME = "__MDX_CONTENT__";

/**
 * A simple factory to create a component from the bundled MDX code.
 * @param code The bundled MDX code (string), expected to be an IIFE.
 * @param globals An object of global variables to make available to the MDX component.
 * @returns The MDX component.
 */
export function getMDXComponent<Props = Record<string, unknown>>(
	code: string,
	globals: Record<string, unknown> = {},
): AnyComponent<Props> {
	// Backup existing global properties that might be overwritten by our globals
	const G = (
		typeof globalThis !== "undefined" ? globalThis : undefined
	) as Record<string, unknown>;

	if (!G) {
		throw new Error(
			"Unable to find global object (globalThis). Execution environment might be too old.",
		);
	}

	const originalGlobals: Record<string, unknown> = {};
	for (const key in globals) {
		if (Object.prototype.hasOwnProperty.call(G, key)) {
			originalGlobals[key] = G[key];
		}
		G[key] = globals[key];
	}

	// Create the function to execute the IIFE code.
	// The IIFE will attach its exports to G[IIFE_GLOBAL_NAME].
	const fn = new Function(code);
	fn();

	const mdxModule = G[IIFE_GLOBAL_NAME] as Record<string, unknown>;

	// Restore original global properties and cleanup
	for (const key in globals) {
		if (originalGlobals[key] !== undefined) {
			G[key] = originalGlobals[key];
		} else {
			delete G[key];
		}
	}
	delete G[IIFE_GLOBAL_NAME];

	if (!mdxModule || typeof mdxModule.default !== "function") {
		throw new Error(
			`MDX Bundling Error: Bundled code did not produce the expected component. 
			 Check for build errors or if the IIFE global name '${IIFE_GLOBAL_NAME}' is correct.
			 Expected a default export function.`,
		);
	}

	return mdxModule.default as AnyComponent<Props>;
}

/**
 * This is a bit more advanced and not typically needed with 'getMDXComponent',
 * but useful if you need to access named exports from the MDX module.
 * @param code The bundled MDX code (string).
 * @param name The name of the export to retrieve.
 * @param globals An object of global variables to make available to the MDX component.
 * @returns The named export.
 */
export function getMDXExport<T = unknown>(
	code: string,
	name: string,
	globals: Record<string, unknown> = {},
): T {
	const G = (
		typeof globalThis !== "undefined" ? globalThis : undefined
	) as Record<string, unknown>; // Use globalThis, fallback to undefined with type assertion

	if (!G) {
		throw new Error(
			"Unable to find global object (globalThis). Execution environment might be too old.",
		);
	}

	const originalGlobals: Record<string, unknown> = {};
	for (const key in globals) {
		if (Object.prototype.hasOwnProperty.call(G, key)) {
			originalGlobals[key] = G[key];
		}
		G[key] = globals[key];
	}

	const fn = new Function(code);
	fn();

	const mdxModule = G[IIFE_GLOBAL_NAME] as Record<string, unknown>;

	// Restore original global properties and cleanup
	for (const key in globals) {
		if (originalGlobals[key] !== undefined) {
			G[key] = originalGlobals[key];
		} else {
			delete G[key];
		}
	}
	delete G[IIFE_GLOBAL_NAME];

	if (!mdxModule || typeof mdxModule[name] === "undefined") {
		throw new Error(
			`MDX Bundling Error: Export "${name}" not found in bundled code. 
			 Check for build errors or if the IIFE global name '${IIFE_GLOBAL_NAME}' is correct.`,
		);
	}
	return mdxModule[name] as T;
}
