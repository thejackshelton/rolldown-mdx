import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
	afterAll,
	afterEach,
	beforeAll,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import { readFile } from "./storage";

describe("readFile", () => {
	const testDir = join(process.cwd(), ".test-storage-fixtures");
	const testFile = join(testDir, "test-file.txt");
	const testContent = "Hello, this is test content!";

	beforeAll(() => {
		if (!existsSync(testDir)) {
			mkdirSync(testDir, { recursive: true });
		}
		writeFileSync(testFile, testContent);
	});

	afterAll(() => {
		if (existsSync(testDir)) {
			rmSync(testDir, { recursive: true });
		}
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("reads file content as string via Node.js", async () => {
		const content = await readFile(testFile);
		expect(content).toBe(testContent);
	});

	it("throws error for non-existent file", async () => {
		await expect(readFile("/does/not/exist.txt")).rejects.toThrow();
	});

	it("uses Bun runtime when available", async () => {
		const mockText = vi.fn().mockResolvedValue("bun content");
		const mockFile = vi.fn().mockReturnValue({ text: mockText });

		vi.stubGlobal("Bun", { file: mockFile });

		const { readFile: readFileFresh } = await import("./storage");
		const content = await readFileFresh("/some/path.txt");

		expect(mockFile).toHaveBeenCalledWith("/some/path.txt");
		expect(content).toBe("bun content");
	});

	it("uses Deno runtime when available", async () => {
		const mockReadTextFile = vi.fn().mockResolvedValue("deno content");

		vi.stubGlobal("Deno", { readTextFile: mockReadTextFile });

		const { readFile: readFileFresh } = await import("./storage");
		const content = await readFileFresh("/some/path.txt");

		expect(mockReadTextFile).toHaveBeenCalledWith("/some/path.txt");
		expect(content).toBe("deno content");
	});
});
