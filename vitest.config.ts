import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

// Unit tests only - browser tests run from tests/vitest.config.ts
export default defineConfig({
	resolve: {
		alias: {
			"rolldown-mdx": resolve(__dirname, "mdx/src/index.ts"),
		},
	},
	test: {
		include: ["mdx/src/**/*.unit.ts"],
		testTimeout: 10000,
		coverage: {
			provider: "v8",
			include: ["mdx/src/**/*.ts"],
			exclude: ["mdx/src/**/*.unit.ts"],
			reporter: ["text", "lcov", "html"],
			reportsDirectory: "./coverage",
		},
	},
});
