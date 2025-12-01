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

	it.each(frameworks)("has configuration for %s", (framework) => {
		expect(frameworkConfigs[framework]).toBeDefined();
		expect(frameworkConfigs[framework].jsxLib).toBeDefined();
		expect(frameworkConfigs[framework].jsxRuntime).toBeDefined();
	});

	it("react config has correct package names", () => {
		const config = frameworkConfigs.react;
		expect(config.jsxLib?.package).toBe("react");
		expect(config.jsxLib?.varName).toBe("React");
		expect(config.jsxRuntime?.package).toBe("react/jsx-runtime");
	});

	it("qwik config has correct package names", () => {
		const config = frameworkConfigs.qwik;
		expect(config.jsxLib?.package).toBe("@builder.io/qwik");
		expect(config.jsxLib?.varName).toBe("Qwik");
	});

	it("hono config includes jsxDom", () => {
		const config = frameworkConfigs.hono;
		expect(config.jsxDom?.package).toBe("hono/jsx/dom");
		expect(config.jsxDom?.varName).toBe("HonoDOM");
	});
});

describe("getFrameworkConfig", () => {
	it("returns react config", () => {
		const config = getFrameworkConfig("react");
		expect(config).toBe(frameworkConfigs.react);
	});

	it("returns qwik config", () => {
		const config = getFrameworkConfig("qwik");
		expect(config).toBe(frameworkConfigs.qwik);
	});

	it("returns preact config with jsxDom", () => {
		const config = getFrameworkConfig("preact");
		expect(config.jsxDom?.package).toBe("preact/compat");
	});
});

describe("deriveGlobals", () => {
	it("derives globals from jsxLib", () => {
		const globals = deriveGlobals({
			jsxLib: { package: "react", varName: "React" },
		});
		expect(globals).toEqual({ react: "React" });
	});

	it("derives globals from jsxRuntime", () => {
		const globals = deriveGlobals({
			jsxRuntime: { package: "react/jsx-runtime", varName: "_jsx" },
		});
		expect(globals).toEqual({ "react/jsx-runtime": "_jsx" });
	});

	it("derives globals from jsxDom", () => {
		const globals = deriveGlobals({
			jsxDom: { package: "hono/jsx/dom", varName: "HonoDOM" },
		});
		expect(globals).toEqual({ "hono/jsx/dom": "HonoDOM" });
	});

	it("derives globals from full config", () => {
		const globals = deriveGlobals({
			jsxLib: { package: "react", varName: "React" },
			jsxRuntime: { package: "react/jsx-runtime", varName: "_jsx" },
		});
		expect(globals).toEqual({
			react: "React",
			"react/jsx-runtime": "_jsx",
		});
	});

	it("handles empty config", () => {
		const globals = deriveGlobals({});
		expect(globals).toEqual({});
	});

	it("handles partial config without varName", () => {
		const globals = deriveGlobals({
			jsxLib: { package: "react" },
		});
		expect(globals).toEqual({});
	});

	it("handles partial config without package", () => {
		const globals = deriveGlobals({
			jsxLib: { varName: "React" },
		});
		expect(globals).toEqual({});
	});
});
