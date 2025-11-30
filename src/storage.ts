import { normalize, parse } from "pathe";
import { createStorage, type Storage } from "unstorage";
import fsLiteDriver from "unstorage/drivers/fs-lite";

const storageCache = new Map<string, Storage>();

function getOrCreateStorage(base: string): Storage {
	let storage = storageCache.get(base);
	if (!storage) {
		storage = createStorage({
			driver: fsLiteDriver({ base }),
		});
		storageCache.set(base, storage);
	}
	return storage;
}

function getStorageForPath(absolutePath: string): {
	storage: Storage;
	key: string;
} {
	const normalized = normalize(absolutePath);
	const { root } = parse(normalized);

	// root is "/" on Unix, "D:/" on Windows
	const base = root || ".";
	const key = normalized.slice(root.length);

	return { storage: getOrCreateStorage(base), key };
}

/**
 * Read a file from disk.
 * Works in Node.js, Deno, and Bun.
 */
export async function readFile(path: string): Promise<string> {
	const { storage, key } = getStorageForPath(path);
	const content = await storage.getItem(key);

	if (content === null || content === undefined) {
		throw new Error(`ENOENT: File not found: ${path}`);
	}

	return typeof content === "string" ? content : String(content);
}
