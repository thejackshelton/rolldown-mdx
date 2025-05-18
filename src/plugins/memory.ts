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
		const isPathWithExtMatch = Object.prototype.hasOwnProperty.call(
			filesMap,
			pathWithExt,
		);
		if (isPathWithExtMatch) {
			return pathWithExt;
		}
	}
	return null;
}

/**
 * Virtual file system for MDX bundling that:
 * - Handles MDX entry point resolution
 * - Resolves imports between in-memory files
 * - Manages file paths with/without extensions
 * - Loads content from memory instead of disk
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

			const isDirectKeyMatch = Object.prototype.hasOwnProperty.call(
				processedFiles,
				resolvedImportPath,
			);
			if (isDirectKeyMatch) {
				debug(
					`[inMemoryPlugin.resolveId] Resolved '${id}' to '${resolvedImportPath}' from processedFiles (direct key match).`,
				);
				return resolvedImportPath;
			}

			const importPathLacksExtension = !extname(resolvedImportPath);

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

			debug(
				`[inMemoryPlugin.resolveId] Failed to resolve '${id}' (resolvedImportPath: ${resolvedImportPath}) in processedFiles. Returning null.`,
			);
			return null;
		},
		load(id: string): string | null {
			debug(`[inMemoryPlugin.load] Attempting to load module with ID: '${id}'`);

			const isEntryPoint = id === entryPointId;
			if (isEntryPoint) {
				debug(
					`[inMemoryPlugin.load] Loading content for special entry point '${id}' (first 100 chars):`,
					String(vfile.value).substring(0, 100),
				);
				return String(vfile.value);
			}

			const isInMemoryFile = Object.prototype.hasOwnProperty.call(
				processedFiles,
				id,
			);

			if (isInMemoryFile) {
				debug(
					`[inMemoryPlugin.load] Loading content for in-memory file '${id}' from processedFiles (first 100 chars):`,
					processedFiles[id].substring(0, 100),
				);
				return processedFiles[id];
			}

			debug(
				`[inMemoryPlugin.load] Module ID '${id}' not found in processedFiles or as entry point. The rolldown-mdx in-memory plugin will not load it.`,
			);
			return null;
		},
	};
}
