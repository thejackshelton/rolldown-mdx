import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
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

	it("reads file content as string", async () => {
		const content = await readFile(testFile);
		expect(content).toBe(testContent);
	});

	it("throws error for non-existent file", async () => {
		await expect(readFile("/does/not/exist.txt")).rejects.toThrow();
	});
});

