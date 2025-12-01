import { describe, expect, it } from "vitest";
import { createMDXComponent, getFrameworkRuntime } from "./jsx";

describe("getFrameworkRuntime", () => {
	const mockFrameworkImport = {
		jsx: () => "jsx-result",
		jsxs: () => "jsxs-result",
		Fragment: Symbol("Fragment"),
		createElement: () => "createElement-result",
	};

	it("creates scope for framework", () => {
		const scope = getFrameworkRuntime("react", mockFrameworkImport);

		expect(scope.React).toBe(mockFrameworkImport);
		expect(scope._jsx).toBeDefined();
		expect((scope._jsx as { jsx: unknown }).jsx).toBe(mockFrameworkImport.jsx);
	});

	it("handles custom jsxConfig", () => {
		const customConfig = {
			jsxLib: { package: "custom", varName: "Custom" },
			jsxRuntime: { package: "custom/runtime", varName: "_custom" },
			jsxImportKeys: {
				jsx: "jsx",
				jsxs: "jsxs",
				Fragment: "Fragment",
			},
		};

		const scope = getFrameworkRuntime(customConfig, mockFrameworkImport);

		expect(scope.Custom).toBe(mockFrameworkImport);
		expect(scope._custom).toBeDefined();
	});

	it("uses fallback keys for jsx functions", () => {
		const minimalImport = {
			createElement: () => "createElement",
			Fragment: Symbol("Fragment"),
		};

		const scope = getFrameworkRuntime("react", minimalImport);

		expect(scope.React).toBe(minimalImport);
		expect(scope._jsx).toBeDefined();
		expect((scope._jsx as { jsx: unknown }).jsx).toBe(
			minimalImport.createElement,
		);
	});

	it("uses placeholder jsx when no keys found", () => {
		const emptyImport = {};

		const scope = getFrameworkRuntime("react", emptyImport);

		expect(scope.React).toBe(emptyImport);
		expect(scope._jsx).toBeDefined();
		const jsxRuntime = scope._jsx as {
			jsx: (tag: unknown, props: unknown) => { tag: unknown; props: unknown };
		};
		const result = jsxRuntime.jsx("div", { id: "test" });
		expect(result).toEqual({ tag: "div", props: { id: "test" } });
	});
});

describe("createMDXComponent", () => {
	const mockReact = {
		jsx: (type: string, props: Record<string, unknown>) => ({
			type,
			props,
		}),
		jsxs: (type: string, props: Record<string, unknown>) => ({
			type,
			props,
		}),
		Fragment: Symbol("Fragment"),
	};

	it("creates component from bundler result with framework", () => {
		const code = `
			const MDXContent = (props) => _jsx.jsx("div", { children: "Hello" });
			return { default: MDXContent, frontmatter: {} };
		`;

		const result = {
			code,
			frontmatter: {},
			matter: { data: {}, content: "" },
			errors: [],
			warnings: [],
			framework: { name: "react" as const, example: "" },
		};

		const Component = createMDXComponent(result, mockReact);
		expect(typeof Component).toBe("function");
	});

	it("creates component from code string with explicit framework", () => {
		const code = `
			const MDXContent = (props) => _jsx.jsx("div", { children: "Hello" });
			return { default: MDXContent, frontmatter: {} };
		`;

		const Component = createMDXComponent(code, mockReact, "react");
		expect(typeof Component).toBe("function");
	});

	it("defaults to react when no framework info available", () => {
		const code = `
			const MDXContent = (props) => _jsx.jsx("div", { children: "Hello" });
			return { default: MDXContent, frontmatter: {} };
		`;

		const Component = createMDXComponent(code, mockReact);
		expect(typeof Component).toBe("function");
	});

	it("uses jsxConfig from bundler result when no framework name", () => {
		const code = `
			const MDXContent = (props) => _jsx.jsx("div", { children: "Hello" });
			return { default: MDXContent, frontmatter: {} };
		`;

		const result = {
			code,
			frontmatter: {},
			matter: { data: {}, content: "" },
			errors: [],
			warnings: [],
			jsxConfig: {
				jsxLib: { package: "react", varName: "React" },
				jsxRuntime: { package: "react/jsx-runtime", varName: "_jsx" },
			},
		};

		const Component = createMDXComponent(result, mockReact);
		expect(typeof Component).toBe("function");
	});
});
