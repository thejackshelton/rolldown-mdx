/// <reference types="vitest" />
import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		// environment: "jsdom", // We'll use per-file comment
		cache: false,
		// setupFiles: ['./tests/setup.ts'], // Temporarily disable to isolate effect of per-file comment
	},
});
