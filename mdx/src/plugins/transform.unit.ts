import { describe, expect, it } from "vitest";
import { createImportsTransformPlugin } from "./transform";

describe("createImportsTransformPlugin", () => {
	const globals = {
		react: "React",
		"react/jsx-runtime": "_jsx",
	};

	const plugin = createImportsTransformPlugin(globals);

	it("has correct plugin name", () => {
		expect(plugin.name).toBe("transform-imports-for-eval");
	});

	it("transforms import specifiers to const declarations", () => {
		const code = `
import { useState, useEffect } from "react";
const x = 1;
`;
		const result = plugin.renderChunk(code);

		expect(result).not.toBeNull();
		expect(result?.code).toContain("const useState = React.useState;");
		expect(result?.code).toContain("const useEffect = React.useEffect;");
		expect(result?.code).toContain("const x = 1;");
	});

	it("transforms default import to const declaration", () => {
		const code = `
import React from "react";
const x = 1;
`;
		const result = plugin.renderChunk(code);

		expect(result).not.toBeNull();
		expect(result?.code).toContain("const React = React.default || React;");
	});

	it("transforms namespace import to const declaration", () => {
		const code = `
import * as ReactAll from "react";
const x = 1;
`;
		const result = plugin.renderChunk(code);

		expect(result).not.toBeNull();
		expect(result?.code).toContain("const ReactAll = React;");
	});

	it("removes imports that are not in globals", () => {
		const code = `
import { something } from "other-package";
const x = 1;
`;
		const result = plugin.renderChunk(code);

		expect(result).not.toBeNull();
		expect(result?.code).not.toContain("import");
		expect(result?.code).not.toContain("something");
		expect(result?.code).toContain("const x = 1;");
	});

	it("removes export declarations", () => {
		const code = `
export const foo = 1;
export default function bar() {}
const x = 1;
`;
		const result = plugin.renderChunk(code);

		expect(result).not.toBeNull();
		expect(result?.code).not.toContain("export");
		expect(result?.code).toContain("const x = 1;");
	});

	it("adds return statement with MDXContent and frontmatter", () => {
		const code = "const x = 1;";
		const result = plugin.renderChunk(code);

		expect(result).not.toBeNull();
		expect(result?.code).toContain("return {");
		expect(result?.code).toContain(
			"default: typeof MDXContent !== 'undefined' ? MDXContent : null",
		);
		expect(result?.code).toContain(
			"frontmatter: typeof frontmatter !== 'undefined' ? frontmatter : {}",
		);
	});

	it("handles mixed imports correctly", () => {
		const code = `
import React, { useState } from "react";
import { jsx } from "react/jsx-runtime";
const Component = () => {};
`;
		const result = plugin.renderChunk(code);

		expect(result).not.toBeNull();
		expect(result?.code).toContain("const React = React.default || React;");
		expect(result?.code).toContain("const useState = React.useState;");
		expect(result?.code).toContain("const jsx = _jsx.jsx;");
	});

	it("returns null map", () => {
		const code = "const x = 1;";
		const result = plugin.renderChunk(code);

		expect(result?.map).toBeNull();
	});

	it("handles empty code", () => {
		const result = plugin.renderChunk("");

		expect(result).not.toBeNull();
		expect(result?.code).toContain("return {");
	});

	it("handles string literal import specifiers", () => {
		const code = `
import { "use-state" as useState } from "react";
const x = 1;
`;
		const result = plugin.renderChunk(code);

		expect(result).not.toBeNull();
		// String literal imports are handled
		expect(result?.code).toContain("const useState = React.use-state;");
	});
});

