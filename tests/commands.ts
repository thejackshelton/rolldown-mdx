import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { BrowserCommand } from "vitest/node";
import { bundleMDX } from "rolldown-mdx";
import type { BundleOptions, TestedFramework } from "./vitest.d.ts";
import * as qwikFixtures from "./qwik/fixtures";
import * as reactFixtures from "./react/fixtures";

const testsDir = __dirname;

const sharedFixtures = {
	config: "data/config.json",
	helpers: "utils/helpers.ts",
} as const satisfies Record<string, string>;

type FixtureModule = Record<string, string>;

const frameworkFixtures: Record<TestedFramework, FixtureModule> = {
	qwik: qwikFixtures,
	react: reactFixtures,
};

function resolveFixture(ref: string, framework: TestedFramework): string {
	const frameworkDir = join(testsDir, framework);

	const frameworkFile = join(frameworkDir, `${ref}.tsx`);
	if (existsSync(frameworkFile)) {
		return readFileSync(frameworkFile, "utf-8");
	}

	if (ref in sharedFixtures) {
		const sharedPath = sharedFixtures[ref as keyof typeof sharedFixtures];
		return readFileSync(join(testsDir, sharedPath), "utf-8");
	}

	const fixtures = frameworkFixtures[framework];
	const fixtureKey = `${ref}Code`;
	if (fixtureKey in fixtures) {
		return fixtures[fixtureKey];
	}

	throw new Error(
		`Unknown fixture reference: @${ref} for framework: ${framework}`,
	);
}

export const bundle: BrowserCommand<[BundleOptions]> = async (
	_ctx,
	options,
) => {
	const processedFiles: Record<string, string> = {};

	for (const [path, value] of Object.entries(options.files ?? {})) {
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
