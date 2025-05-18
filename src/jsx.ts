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

export type MDXComponent<P = Record<string, unknown>, R = unknown> = (
	props: P,
) => R;

/**
 * Creates a component from the bundled MDX code.
 * @template P The expected props type for the MDX component.
 * @template R The expected return type of the MDX component.
 * @template T The actual component function signature.
 * @param code The bundled MDX code string. This string is expected to be a function body that returns the MDX module exports.
 * @param scope An object of variables to make available within the MDX code's scope.
 * @returns The default exported MDX component, typed as T.
 */
export function getMDXComponent<
	P = Record<string, unknown>,
	R = unknown,
	T extends MDXComponent<P, R> = MDXComponent<P, R>,
>(code: string, scope: Record<string, unknown> = {}): T {
	const mdxModule = getMDXExport<{
		default?: T;
		[key: string]: unknown;
	}>(code, scope);

	if (typeof mdxModule.default !== "function") {
		throw new Error(
			"MDX execution failed: The 'default' export is not a function. Make sure your MDX content exports a component as default.",
		);
	}
	return mdxModule.default as T;
}

/**
 * Executes the bundled MDX code and returns all its exports.
 * @template ExportedObject The expected type of the entire module exports.
 * @param code The bundled MDX code string. This string is expected to be a function body that returns the MDX module exports.
 * @param scope An object of variables to make available within the MDX code's scope.
 * @returns The MDX module's exports.
 */
export function getMDXExport<ExportedObject = Record<string, unknown>>(
	code: string,
	scope: Record<string, unknown> = {},
): ExportedObject {
	const fnScopeKeys = Object.keys(scope);
	const fnScopeValues = Object.values(scope);

	console.log(
		"Executing MDX code with new Function. Code (first 300 chars):",
		code.substring(0, 300),
	);
	console.log("Scope keys for new Function:", fnScopeKeys);

	const fn = new Function(...fnScopeKeys, code);
	const mdxModuleExports = fn(...fnScopeValues);

	if (!mdxModuleExports) {
		throw new Error(
			"MDX module execution failed: The code did not return any exports.",
		);
	}

	return mdxModuleExports as ExportedObject;
}
