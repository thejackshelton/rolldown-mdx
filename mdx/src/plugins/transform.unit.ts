import { describe, expect, it } from "vitest";
import { createImportsTransformPlugin } from "./transform";

describe("createImportsTransformPlugin", () => {
	const globals = {
		react: "React",
		"react/jsx-runtime": "_jsx",
	};

	const plugin = createImportsTransformPlugin(globals);

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

	it("handles empty code", () => {
		const result = plugin.renderChunk("");

		expect(result).not.toBeNull();
		expect(result?.code).toContain("return {");
	});

	it("handles import without specifiers", () => {
		const code = `
import "side-effect-module";
const x = 1;
`;
		const result = plugin.renderChunk(code);

		expect(result).not.toBeNull();
		expect(result?.code).toContain("const x = 1;");
		expect(result?.code).not.toContain("side-effect-module");
	});

	it("handles parenthesized expressions", () => {
		const code = `
const x = (1 + 2);
const y = ((a) => a * 2);
`;
		const result = plugin.renderChunk(code);

		expect(result).not.toBeNull();
		expect(result?.code).toContain("(1 + 2)");
	});

	it("handles string literal imports", () => {
		const code = `
import { "kebab-case" as kebabCase } from "react";
const x = 1;
`;
		const result = plugin.renderChunk(code);

		expect(result).not.toBeNull();
		expect(result?.code).toContain("const kebabCase = React.kebab-case;");
	});
});
