import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { VFile } from "vfile";
import { createInMemoryPlugin } from "./memory";

describe("createInMemoryPlugin", () => {
	const testDir = join(process.cwd(), ".test-fixtures");
	const testFile = join(testDir, "real-file.ts");

	beforeAll(() => {
		if (!existsSync(testDir)) {
			mkdirSync(testDir, { recursive: true });
		}
		writeFileSync(testFile, 'export const realContent = "from disk";');
	});

	afterAll(() => {
		if (existsSync(testDir)) {
			rmSync(testDir, { recursive: true });
		}
	});

	const createPlugin = (overrides = {}) => {
		const cwd = process.cwd();
		return createInMemoryPlugin({
			entryPointId: "entry.mdx",
			processedFiles: {
				[resolve(cwd, "virtual-file.ts")]: 'export const x = "virtual";',
				[resolve(cwd, "components/button.tsx")]:
					'export const Button = () => "button";',
			},
			vfile: new VFile({
				value: "# Hello",
				path: resolve(cwd, "source.mdx"),
			}),
			cwd,
			resolveExtensions: [".tsx", ".ts", ".jsx", ".js"],
			debug: vi.fn(),
			...overrides,
		});
	};

	describe("plugin metadata", () => {
		it("has correct plugin name", () => {
			const plugin = createPlugin();
			expect(plugin.name).toBe("in-memory-loader");
		});
	});

	describe("resolveId", () => {
		it("resolves entry point id", () => {
			const plugin = createPlugin();
			const result = plugin.resolveId("entry.mdx", undefined);
			expect(result).toBe("entry.mdx");
		});

		it("resolves ./entry.mdx to entry point", () => {
			const plugin = createPlugin();
			const result = plugin.resolveId("./entry.mdx", undefined);
			expect(result).toBe("entry.mdx");
		});

		it("resolves virtual file from processedFiles", () => {
			const plugin = createPlugin();
			const result = plugin.resolveId("./virtual-file.ts", "entry.mdx");
			expect(result).toBe(resolve(process.cwd(), "virtual-file.ts"));
		});

		it("resolves virtual file without extension", () => {
			const plugin = createPlugin();
			const result = plugin.resolveId("./virtual-file", "entry.mdx");
			expect(result).toBe(resolve(process.cwd(), "virtual-file.ts"));
		});

		it("resolves nested virtual file", () => {
			const plugin = createPlugin();
			const result = plugin.resolveId("./components/button", "entry.mdx");
			expect(result).toBe(resolve(process.cwd(), "components/button.tsx"));
		});

		it("resolves real file from file system", () => {
			const plugin = createPlugin();
			const result = plugin.resolveId(testFile, "entry.mdx");
			expect(result).toBe(testFile);
		});

		it("returns null for non-existent file", () => {
			const plugin = createPlugin();
			const result = plugin.resolveId("./does-not-exist.ts", "entry.mdx");
			expect(result).toBeNull();
		});

		it("uses cwd when no importer", () => {
			const plugin = createPlugin();
			const result = plugin.resolveId("./virtual-file.ts", undefined);
			expect(result).toBe(resolve(process.cwd(), "virtual-file.ts"));
		});

		it("uses importer directory for relative resolution", () => {
			const cwd = process.cwd();
			const plugin = createInMemoryPlugin({
				entryPointId: "entry.mdx",
				processedFiles: {
					[resolve(cwd, "lib/utils.ts")]: "export const util = 1;",
				},
				vfile: new VFile({ value: "", path: resolve(cwd, "source.mdx") }),
				cwd,
				resolveExtensions: [".ts"],
				debug: vi.fn(),
			});

			const result = plugin.resolveId(
				"./utils",
				resolve(cwd, "lib/component.ts"),
			);
			expect(result).toBe(resolve(cwd, "lib/utils.ts"));
		});
	});

	describe("load", () => {
		it("loads entry point content from vfile", () => {
			const plugin = createPlugin();
			const result = plugin.load("entry.mdx");
			expect(result).toBe("# Hello");
		});

		it("loads virtual file from processedFiles", () => {
			const plugin = createPlugin();
			const resolvedPath = resolve(process.cwd(), "virtual-file.ts");
			const result = plugin.load(resolvedPath);
			expect(result).toBe('export const x = "virtual";');
		});

		it("loads real file from file system", () => {
			const plugin = createPlugin();
			const result = plugin.load(testFile);
			expect(result).toBe('export const realContent = "from disk";');
		});

		it("returns null for non-existent file", () => {
			const plugin = createPlugin();
			const result = plugin.load("/does/not/exist.ts");
			expect(result).toBeNull();
		});
	});
});

