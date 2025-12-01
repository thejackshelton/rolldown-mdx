import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { BrowserCommand } from "vitest/node";
import { bundleMDX } from "../src/index";

const testsDir = __dirname;

// Read shared test files
const configJson = readFileSync(join(testsDir, "data/config.json"), "utf-8");
const helpersCode = readFileSync(join(testsDir, "utils/helpers.ts"), "utf-8");

interface BundleOptions {
	source: string;
	files?: Record<string, string>;
	framework: "qwik" | "react";
}

export const bundle: BrowserCommand<[BundleOptions]> = async (
	_ctx,
	options,
) => {
	const frameworkDir = join(testsDir, options.framework);

	// Read framework-specific component files
	const counterCode = readFileSync(join(frameworkDir, "counter.tsx"), "utf-8");
	const greetingCode = readFileSync(
		join(frameworkDir, "greeting.tsx"),
		"utf-8",
	);

	// Import framework-specific fixtures
	const fixtures =
		options.framework === "qwik"
			? await import("./qwik/fixtures")
			: await import("./react/fixtures");

	// Replace placeholders in files with actual code
	const processedFiles: Record<string, string> = {};
	for (const [key, value] of Object.entries(options.files || {})) {
		let processed = value;
		if (processed === "__COUNTER__") processed = counterCode;
		else if (processed === "__GREETING__") processed = greetingCode;
		else if (processed === "__CONFIG_JSON__") processed = configJson;
		else if (processed === "__HELPERS__") processed = helpersCode;
		else if (processed === "__MY_DEMO__") processed = fixtures.myDemoCode;
		else if (processed === "__MY_SUB__") processed = fixtures.mySubCode;
		else if (processed === "__SMOKE_DEMO__") processed = fixtures.smokeDemoCode;
		else if (processed === "__MY_SUB_DIR__") processed = fixtures.mySubDirCode;
		else if (processed === "__CLSX_TEST__")
			processed = fixtures.clsxTestComponentCode;
		processedFiles[key] = processed;
	}

	const result = await bundleMDX({
		source: options.source,
		files: processedFiles,
		framework: options.framework,
	});

	return result;
};
