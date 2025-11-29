import { existsSync, readFileSync } from "node:fs";
import { dirname, extname, resolve } from "pathe";
import type { VFile } from "vfile";

export interface InMemoryPluginOptions {
	entryPointId: string;
	processedFiles: Record<string, string>;
	vfile: VFile;
	cwd: string;
	resolveExtensions: string[];
	debug: (...args: unknown[]) => void;
}

function findPathWithExt(
	basePath: string,
	extensions: string[],
	filesMap: Record<string, string>,
): string | null {
	for (const ext of extensions) {
		const pathWithExt = basePath + ext;
		const isPathWithExtMatch = Object.hasOwn(filesMap, pathWithExt);
		if (isPathWithExtMatch) {
			return pathWithExt;
		}
	}
	return null;
}

/**
 * Check file system for a path, trying extensions if needed
 */
function findFileSystemPathWithExt(
	basePath: string,
	extensions: string[],
): string | null {
	if (existsSync(basePath)) {
		return basePath;
	}
	for (const ext of extensions) {
		const pathWithExt = basePath + ext;
		if (existsSync(pathWithExt)) {
			return pathWithExt;
		}
	}
	return null;
}

/**
 * Virtual file system for MDX bundling that:
 * - Handles MDX entry point resolution
 * - Resolves imports from in-memory files first (processedFiles)
 * - Falls back to file system (like mdx-bundler/esbuild does automatically)
 * - Manages file paths with/without extensions
 */
export function createInMemoryPlugin({
	entryPointId,
	processedFiles,
	vfile,
	cwd,
	resolveExtensions,
	debug,
}: InMemoryPluginOptions) {
	return {
		name: "in-memory-loader",
		resolveId(id: string, importer?: string): string | null {
			debug(
				`[inMemoryPlugin.resolveId] Attempting to resolve: '${id}' from importer: '${importer}'`,
			);

			if (id === entryPointId || id === `./${entryPointId}`) {
				debug(
					`[inMemoryPlugin.resolveId] Resolved '${id}' to special entry point '${entryPointId}'`,
				);
				return entryPointId;
			}

			let baseDir: string;
			if (importer) {
				if (importer === entryPointId) {
					baseDir = dirname(vfile.path as string);
				} else {
					baseDir = dirname(importer);
				}
			} else {
				baseDir = cwd;
			}

			const resolvedImportPath = resolve(baseDir, id);
			debug(
				`[inMemoryPlugin.resolveId] Resolved import path for '${id}': ${resolvedImportPath}`,
			);

			// 1. Check processedFiles (virtual file system) - direct match
			if (Object.hasOwn(processedFiles, resolvedImportPath)) {
				debug(
					`[inMemoryPlugin.resolveId] Resolved '${id}' to '${resolvedImportPath}' from processedFiles (direct key match).`,
				);
				return resolvedImportPath;
			}

			const importPathLacksExtension = !extname(resolvedImportPath);

			// 2. Check processedFiles with extension resolution
			if (importPathLacksExtension) {
				const resolvedFullPath = findPathWithExt(
					resolvedImportPath,
					resolveExtensions,
					processedFiles,
				);
				if (resolvedFullPath) {
					debug(
						`[inMemoryPlugin.resolveId] Resolved '${id}' to '${resolvedFullPath}' from processedFiles (added extension).`,
					);
					return resolvedFullPath;
				}
			}

			// 3. Fall back to file system (what esbuild does automatically for mdx-bundler)
			const fsPath = findFileSystemPathWithExt(
				resolvedImportPath,
				importPathLacksExtension ? resolveExtensions : [],
			);
			if (fsPath) {
				debug(
					`[inMemoryPlugin.resolveId] Resolved '${id}' to '${fsPath}' from file system.`,
				);
				return fsPath;
			}

			debug(
				`[inMemoryPlugin.resolveId] Failed to resolve '${id}' in processedFiles or file system. Returning null.`,
			);
			return null;
		},
		load(id: string): string | null {
			debug(`[inMemoryPlugin.load] Attempting to load module with ID: '${id}'`);

			// 1. Handle entry point
			if (id === entryPointId) {
				debug(
					`[inMemoryPlugin.load] Loading content for special entry point '${id}'`,
				);
				return String(vfile.value);
			}

			// 2. Check processedFiles (virtual file system)
			if (Object.hasOwn(processedFiles, id)) {
				debug(
					`[inMemoryPlugin.load] Loading content for in-memory file '${id}' from processedFiles`,
				);
				return processedFiles[id];
			}

			// 3. Fall back to file system (what esbuild does automatically for mdx-bundler)
			if (existsSync(id)) {
				const content = readFileSync(id, "utf-8");
				debug(
					`[inMemoryPlugin.load] Loading content for '${id}' from file system`,
				);
				return content;
			}

			debug(
				`[inMemoryPlugin.load] Module ID '${id}' not found. Returning null.`,
			);
			return null;
		},
	};
}
