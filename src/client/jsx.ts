// Define a generic type for a component function if JSX namespace is not globally available.
// Users of specific frameworks (React, Qwik, Solid) will have their own JSX.Element types.
// This client aims to be framework-agnostic in its type signature here.
type AnyComponent<Props = Record<string, unknown>> = (props: Props) => unknown; // More generic than JSX.Element

/**
 * A simple factory to create a component from the bundled MDX code.
 * @param code The bundled MDX code (string).
 * @param globals An object of global variables to make available to the MDX component.
 *                For Qwik, this would include Qwik itself and its JSX runtime.
 * @returns The MDX component.
 */
export function getMDXComponent<Props = Record<string, unknown>>(
	code: string,
	globals: Record<string, unknown> = {},
): AnyComponent<Props> {
	const scope = { ...globals };
	const keys = Object.keys(scope);
	const values = Object.values(scope);

	// Sanitize keys to be valid variable names if they aren't already.
	// Though typically, keys from `globals` like `Qwik` or `_jsx_runtime` are valid.
	const fn = new Function(...keys, `return ${code}`);
	const mdxModule = fn(...values);

	// The bundled code from MDX typically exports the component as default.
	if (typeof mdxModule.default !== "function") {
		throw new Error(
			`MDX bundled code does not export a default function component.\nReceived: ${typeof mdxModule.default}\nCode: ${code.slice(0, 200)}...`,
		);
	}

	return mdxModule.default as AnyComponent<Props>;
}

/**
 * If your MDX file has named exports, you can get them using this function.
 * @param code The bundled MDX code (string).
 * @param globals An object of global variables to make available.
 * @returns All exports from the MDX module.
 */
export function getMDXExport<Exports = Record<string, unknown>>(
	code: string,
	globals: Record<string, unknown> = {},
): Exports & { default: AnyComponent } {
	const scope = { ...globals };
	const keys = Object.keys(scope);
	const values = Object.values(scope);

	const fn = new Function(...keys, `return ${code}`);
	const mdxModule = fn(...values);

	if (!mdxModule) {
		throw new Error(
			`MDX bundled code did not produce a module.\nCode: ${code.slice(0, 200)}...`,
		);
	}

	return mdxModule as Exports & { default: AnyComponent };
}
