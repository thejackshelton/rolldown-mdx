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

/**
 * @typedef {import('../types').MDXContentProps} MDXContentProps
 */

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
	const fn = new Function(...Object.keys(scope), code);
	return fn(...Object.values(scope));
}

export { getMDXComponent, getMDXExport };
