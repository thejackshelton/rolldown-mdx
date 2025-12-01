import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { bundleMDX } from "./index";

describe("bundleMDX", () => {
	const testDir = join(process.cwd(), ".test-bundler-fixtures");
	const mdxFile = join(testDir, "test.mdx");

	beforeAll(() => {
		if (!existsSync(testDir)) {
			mkdirSync(testDir, { recursive: true });
		}
		writeFileSync(
			mdxFile,
			`---
title: Test Post
---

# Hello World

This is a test.
`,
		);
	});

	afterAll(() => {
		if (existsSync(testDir)) {
			rmSync(testDir, { recursive: true });
		}
	});

	describe("input validation", () => {
		it("throws when both source and file are provided", async () => {
			await expect(
				bundleMDX({
					source: "# Hello",
					file: "some-file.mdx",
				}),
			).rejects.toThrow(
				"Cannot specify both 'source' and 'file'. Use one or the other.",
			);
		});

		it("throws when neither source nor file is provided", async () => {
			await expect(bundleMDX({})).rejects.toThrow(
				"Must specify either 'source' or 'file'.",
			);
		});
	});

	describe("source input", () => {
		it("bundles simple MDX from string source", async () => {
			const result = await bundleMDX({
				source: "# Hello World",
				framework: "react",
			});

			expect(result.code).toBeDefined();
			expect(result.code.length).toBeGreaterThan(0);
			expect(result.errors).toHaveLength(0);
		});

		it("extracts frontmatter from source", async () => {
			const result = await bundleMDX({
				source: `---
title: My Title
author: Test Author
---

# Content
`,
				framework: "react",
			});

			expect(result.frontmatter).toEqual({
				title: "My Title",
				author: "Test Author",
			});
			expect(result.matter.data).toEqual({
				title: "My Title",
				author: "Test Author",
			});
		});
	});

	describe("file input", () => {
		it("bundles MDX from file path", async () => {
			const result = await bundleMDX({
				file: mdxFile,
				framework: "react",
			});

			expect(result.code).toBeDefined();
			expect(result.frontmatter.title).toBe("Test Post");
		});
	});

	describe("framework configuration", () => {
		it("includes framework info in result", async () => {
			const result = await bundleMDX({
				source: "# Hello",
				framework: "react",
			});

			expect(result.framework).toBeDefined();
			expect(result.framework?.name).toBe("react");
			expect(result.framework?.example).toContain("createMDXComponent");
			expect(result.jsxConfig?.jsxLib?.package).toBe("react");
		});

		it("allows custom jsxConfig override", async () => {
			const result = await bundleMDX({
				source: "# Hello",
				framework: "react",
				jsxConfig: {
					jsxLib: { package: "react", varName: "CustomReact" },
				},
			});

			expect(result.jsxConfig?.jsxLib?.varName).toBe("CustomReact");
		});

		it("works without framework (custom jsxConfig)", async () => {
			const result = await bundleMDX({
				source: "# Hello",
				jsxConfig: {
					jsxLib: { package: "preact", varName: "h" },
				},
			});

			expect(result.framework).toBeUndefined();
			expect(result.jsxConfig?.jsxLib?.package).toBe("preact");
		});
	});

	describe("virtual files", () => {
		it("resolves imports from virtual files", async () => {
			const result = await bundleMDX({
				source: `
import { greeting } from './helper'

# {greeting}
`,
				framework: "react",
				files: {
					"./helper.ts": 'export const greeting = "Hello from virtual file";',
				},
			});

			expect(result.code).toBeDefined();
			expect(result.errors).toHaveLength(0);
		});
	});

	describe("mdx options", () => {
		it("allows customizing mdx options via function", async () => {
			let receivedFrontmatter: Record<string, unknown> | null = null;

			const result = await bundleMDX({
				source: `---
custom: value
---

# Hello
`,
				framework: "react",
				mdx: (options, frontmatter) => {
					receivedFrontmatter = frontmatter;
					return options;
				},
			});

			expect(receivedFrontmatter).toEqual({ custom: "value" });
			expect(result.code).toBeDefined();
		});
	});

	describe("globals", () => {
		it("merges custom globals with framework globals", async () => {
			const result = await bundleMDX({
				source: "# Hello",
				framework: "react",
				globals: {
					lodash: "_",
				},
			});

			expect(result.code).toBeDefined();
		});
	});

	describe("output format", () => {
		it("returns matter with data and content", async () => {
			const result = await bundleMDX({
				source: `---
key: value
---

# Content here
`,
				framework: "react",
			});

			expect(result.matter.data).toEqual({ key: "value" });
			expect(result.matter.content).toContain("# Content here");
		});

		it("handles MDX without frontmatter", async () => {
			const result = await bundleMDX({
				source: "# Just content",
				framework: "react",
			});

			expect(result.frontmatter).toEqual({});
			expect(result.matter.data).toEqual({});
		});
	});
});
