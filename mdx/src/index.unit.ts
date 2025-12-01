import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { VFile } from "vfile";
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

		it("bundles MDX from VFile", async () => {
			const vfile = new VFile({
				value: "# From VFile",
				path: join(process.cwd(), "vfile-test.mdx"),
			});

			const result = await bundleMDX({
				source: vfile,
				framework: "react",
			});

			expect(result.code).toBeDefined();
			expect(result.errors).toHaveLength(0);
		});

		it("sets default path for VFile without path", async () => {
			const vfile = new VFile({ value: "# No path" });

			const result = await bundleMDX({
				source: vfile,
				framework: "react",
			});

			expect(result.code).toBeDefined();
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
		it("includes framework info in result for react", async () => {
			const result = await bundleMDX({
				source: "# Hello",
				framework: "react",
			});

			expect(result.framework).toBeDefined();
			expect(result.framework?.name).toBe("react");
			expect(result.framework?.example).toContain("createMDXComponent");
		});

		it("includes framework info in result for qwik", async () => {
			const result = await bundleMDX({
				source: "# Hello",
				framework: "qwik",
			});

			expect(result.framework?.name).toBe("qwik");
		});

		it("includes jsxConfig in result", async () => {
			const result = await bundleMDX({
				source: "# Hello",
				framework: "react",
			});

			expect(result.jsxConfig).toBeDefined();
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

		it("resolves nested virtual files", async () => {
			const result = await bundleMDX({
				source: `
import { Button } from './components/button'

<Button />
`,
				framework: "react",
				files: {
					"./components/button.tsx":
						"export const Button = () => <button>Click</button>;",
				},
			});

			expect(result.code).toBeDefined();
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

			// The code should be generated (globals affect externals)
			expect(result.code).toBeDefined();
		});

		it("custom globals work without framework", async () => {
			const result = await bundleMDX({
				source: "# Hello",
				globals: {
					myLib: "MyLib",
				},
				jsxConfig: {
					jsxLib: { package: "react", varName: "React" },
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
