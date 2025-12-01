import { resolve } from "node:path";
import { qwikVite } from "@builder.io/qwik/optimizer";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig, type ViteUserConfig } from "vitest/config";
import { bundle } from "./tests/commands";

const createConfig = (
	name: "qwik" | "react",
	plugins: ViteUserConfig["plugins"],
	esbuild?: ViteUserConfig["esbuild"],
) => ({
	plugins,
	esbuild,
	resolve: {
		alias: {
			"#setup": resolve(__dirname, `tests/${name}/setup.ts`),
		},
	},
	test: {
		name,
		include: ["tests/test.tsx"],
		env: { VITEST_PROJECT_NAME: name },
		browser: {
			enabled: true,
			provider: playwright(),
			instances: [{ browser: "chromium" as const, name: `${name}-chromium` }],
			commands: { bundle },
		},
	},
});

export default defineConfig({
	test: {
		projects: [
			createConfig("qwik", [qwikVite()]),
			createConfig("react", [], { jsx: "automatic" }),
		],
	},
});
