// Define a generic type for a component function
type AnyComponent<Props = Record<string, unknown>> = (props: Props) => unknown;

/**
 * Executes the bundled CommonJS MDX code string.
 * @param code The bundled MDX code (CommonJS string).
 * @param executionGlobals An object mapping external package names to their actual library objects.
 *                         These will be resolved by the `require` shim.
 * @returns The `module.exports` from the executed code.
 */
function executeCJS(
	code: string,
	executionGlobals: Record<string, unknown> = {},
): unknown {
	const exports = {};
	const module = { exports };

	const requireShim = (id: string): unknown => {
		if (executionGlobals[id]) {
			return executionGlobals[id];
		}
		throw new Error(
			`[rolldown-mdx] Cannot find module '${id}' during CJS execution. Ensure it's in 'globals' passed to getMDXComponent/getMDXExport. Available globals: ${Object.keys(executionGlobals).join(", ") || "(none)"}`,
		);
	};

	const argNames = ["exports", "require", "module"];
	const argValues = [exports, requireShim, module];

	console.log(
		"[executeCJS] Attempting to execute CJS code (first 500 chars):",
		code.substring(0, 500) + (code.length > 500 ? "..." : ""),
	);

	try {
		const fn = new Function(...argNames, code);
		fn(...argValues);
	} catch (error) {
		console.error("[executeCJS] Error executing CJS bundle:", error);
		console.error(
			"[executeCJS] Bundle code (problematic section might be earlier):",
		);
		const errorLines =
			error instanceof Error && error.stack ? error.stack.split("\n") : [];
		const lineNumMatch = errorLines.find((line) =>
			line.includes("<anonymous>:"),
		);
		let problemLine = -1;
		if (lineNumMatch) {
			const parts = lineNumMatch.split(":");
			// new Function() code is often wrapped, line numbers in stack are relative to the function body.
			// The actual line number within the 'code' string might be the second to last part.
			if (parts.length >= 3)
				problemLine = Number.parseInt(parts[parts.length - 2], 10) - 1; // -1 because new Function wraps code.
		}

		if (problemLine !== -1 && problemLine < code.split("\n").length) {
			console.error("--- Potentially problematic line snippet ---");
			const codeLines = code.split("\n");
			const start = Math.max(0, problemLine - 2);
			const end = Math.min(codeLines.length, problemLine + 3);
			console.error(codeLines.slice(start, end).join("\n"));
			console.error("-----------------------------------------");
		} else {
			console.error(
				"(Could not determine problematic line from stack trace or stack trace unavailable)",
			);
			console.error(
				"Full CJS Code (first 1000 chars):",
				code.substring(0, 1000),
			);
		}
		throw error;
	}

	return module.exports;
}

/**
 * Creates a component from the bundled MDX code (CommonJS string).
 * @param code The bundled MDX code (CommonJS string).
 * @param globals An object mapping external package names to their actual library objects.
 * @returns The MDX component.
 */
export function getMDXComponent<Props = Record<string, unknown>>(
	code: string,
	globals: Record<string, unknown> = {},
): AnyComponent<Props> {
	const mdxModule = executeCJS(code, globals) as {
		default?: AnyComponent<Props>;
		[key: string]: unknown;
	};

	if (typeof mdxModule.default !== "function") {
		console.error(
			"[getMDXComponent] MDX module missing default export function. Exports:",
			mdxModule,
		);
		throw new Error(
			"MDX Bundling Error: Module did not have a default export function.",
		);
	}
	return mdxModule.default;
}

/**
 * Retrieves a named export from the bundled MDX code (CommonJS string).
 * @param code The bundled MDX code (CommonJS string).
 * @param name The name of the export to retrieve.
 * @param globals An object mapping external package names to their actual library objects.
 * @returns The named export.
 */
export function getMDXExport<T = unknown>(
	code: string,
	name: string,
	globals: Record<string, unknown> = {},
): T {
	const mdxModule = executeCJS(code, globals) as Record<string, unknown>; // Corrected: executeCJS

	if (typeof mdxModule[name] === "undefined") {
		console.error(
			`[getMDXExport] Export "${name}" not found. Exports:`,
			mdxModule,
		);
		throw new Error(
			`MDX Bundling Error: Export "${name}" not found in module.`,
		);
	}
	return mdxModule[name] as T;
}
