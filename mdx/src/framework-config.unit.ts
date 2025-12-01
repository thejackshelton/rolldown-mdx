import { describe, expect, it } from "vitest";
import {
	deriveGlobals,
	frameworkConfigs,
	getFrameworkConfig,
	type SupportedFramework,
} from "./framework-config";

describe("frameworkConfigs", () => {
	const frameworks: SupportedFramework[] = [
		"react",
		"preact",
		"solid",
		"vue",
		"qwik",
		"hono",
		"brisa",
	];

	it.each(frameworks)("has valid configuration for %s", (framework) => {
		const config = frameworkConfigs[framework];
		expect(config).toBeDefined();
		expect(config.jsxLib?.package).toBeDefined();
		expect(config.jsxLib?.varName).toBeDefined();
		expect(config.jsxRuntime?.package).toBeDefined();
	});
});

describe("getFrameworkConfig", () => {
	it("returns the correct config object", () => {
		expect(getFrameworkConfig("react")).toBe(frameworkConfigs.react);
		expect(getFrameworkConfig("qwik")).toBe(frameworkConfigs.qwik);
	});
});

describe("deriveGlobals", () => {
	it("derives globals from full config", () => {
		const globals = deriveGlobals({
			jsxLib: { package: "react", varName: "React" },
			jsxRuntime: { package: "react/jsx-runtime", varName: "_jsx" },
			jsxDom: { package: "hono/jsx/dom", varName: "HonoDOM" },
		});
		expect(globals).toEqual({
			react: "React",
			"react/jsx-runtime": "_jsx",
			"hono/jsx/dom": "HonoDOM",
		});
	});

	it("handles empty or partial config", () => {
		expect(deriveGlobals({})).toEqual({});
		expect(deriveGlobals({ jsxLib: { package: "react" } })).toEqual({});
		expect(deriveGlobals({ jsxLib: { varName: "React" } })).toEqual({});
	});
});
