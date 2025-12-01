import { defineConfig } from "tsdown";
import pkg from "./package.json" with { type: "json" };

const { dependencies = {}, peerDependencies = {} } = pkg as {
	dependencies?: Record<string, string>;
	peerDependencies?: Record<string, string>;
};

const makeRegex = (dep: string) => new RegExp(`^${dep}(/.*)?$`);
const excludeAll = (obj: Record<string, string>) =>
	Object.keys(obj).map(makeRegex);

export default defineConfig({
	entry: ["./src/index.ts"],
	platform: "neutral",
	external: [
		/^node:.*/,
		...excludeAll(dependencies),
		...excludeAll(peerDependencies),
	],
});
