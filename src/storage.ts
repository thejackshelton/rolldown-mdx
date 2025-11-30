import { createStorage } from "unstorage";
import fsLiteDriver from "unstorage/drivers/fs-lite";

const storage = createStorage({
	driver: fsLiteDriver({ base: "/" }),
});

/**
 * Read a file from disk.
 * Works in Node.js, Deno, and Bun.
 */
export async function readFile(path: string): Promise<string> {
	// Remove leading slash for unstorage key format
	const key = path.startsWith("/") ? path.slice(1) : path;
	const content = await storage.getItem(key);

	if (content === null || content === undefined) {
		throw new Error(`ENOENT: File not found: ${path}`);
	}

	return typeof content === "string" ? content : String(content);
}
