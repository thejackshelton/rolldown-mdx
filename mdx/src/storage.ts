declare const Bun:
	| { file: (path: string) => { text: () => Promise<string> } }
	| undefined;
declare const Deno:
	| { readTextFile: (path: string) => Promise<string> }
	| undefined;

export async function readFile(path: string): Promise<string> {
	// Bun
	if (typeof Bun !== "undefined") {
		return Bun.file(path).text();
	}
	// Deno
	if (typeof Deno !== "undefined") {
		return Deno.readTextFile(path);
	}
	// Node.js
	const fs = await import("node:fs/promises");
	return fs.readFile(path, "utf-8");
}
