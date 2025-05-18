import { defineConfig } from "tsdown";

export default defineConfig({
	entry: ["./src/index.ts"],
	platform: "neutral",
	external: ["node:module", "node:fs", "node:child_process"],
});
