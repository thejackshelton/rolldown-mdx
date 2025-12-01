import { resolve } from "node:path";
import { qwikVite as qwik } from "@builder.io/qwik/optimizer";
import react from "@vitejs/plugin-react";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig, type ViteUserConfig } from "vitest/config";
import { bundle } from "./commands";

const createConfig = (
	name: "qwik" | "react",
	plugins: ViteUserConfig["plugins"],
) => ({
	plugins,
	resolve: {
		alias: {
			"#setup": resolve(__dirname, `${name}/setup.ts`),
			"rolldown-mdx": resolve(__dirname, "../mdx/src/jsx.ts"),
		},
	},
	test: {
		name,
		include: ["test.tsx"],
		testTimeout: 2000,
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
			createConfig("qwik", [qwik({ srcDir: "./qwik" })]),
			createConfig("react", [react()]),
		],
	},
});
