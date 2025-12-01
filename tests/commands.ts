import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { BrowserCommand } from "vitest/node";
import { bundleMDX } from "rolldown-mdx";
import * as qwikFixtures from "./qwik/fixtures";
import * as reactFixtures from "./react/fixtures";

const testsDir = __dirname;

const sharedFixtures: Record<string, string> = {
	config: "data/config.json",
	helpers: "utils/helpers.ts",
};

const frameworkFixtures = {
	qwik: qwikFixtures,
	react: reactFixtures,
} as const;

function resolveFixture(ref: string, framework: "qwik" | "react"): string {
	const frameworkDir = join(testsDir, framework);

	const frameworkFile = join(frameworkDir, `${ref}.tsx`);
	if (existsSync(frameworkFile)) {
		return readFileSync(frameworkFile, "utf-8");
	}

	if (sharedFixtures[ref]) {
		return readFileSync(join(testsDir, sharedFixtures[ref]), "utf-8");
	}

	const fixtures = frameworkFixtures[framework];
	const fixtureKey = `${ref}Code` as keyof typeof fixtures;
	if (fixtureKey in fixtures) {
		return fixtures[fixtureKey] as string;
	}

	throw new Error(
		`Unknown fixture reference: @${ref} for framework: ${framework}`,
	);
}

interface BundleOptions {
	source: string;
	files?: Record<string, string>;
	framework: "qwik" | "react";
}

export const bundle: BrowserCommand<[BundleOptions]> = async (
	_ctx,
	options,
) => {
	const processedFiles: Record<string, string> = {};

	for (const [path, value] of Object.entries(options.files || {})) {
		if (value.startsWith("@")) {
			const ref = value.slice(1);
			processedFiles[path] = resolveFixture(ref, options.framework);
		} else {
			processedFiles[path] = value;
		}
	}

	return bundleMDX({
		source: options.source,
		files: processedFiles,
		framework: options.framework,
	});
};
