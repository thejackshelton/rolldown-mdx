import { existsSync, readFileSync } from "node:fs";
import { dirname, extname, isAbsolute, relative, resolve } from "pathe";
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
 * - Returns relative paths (relative to process.cwd()) for Qwik compatibility
 *   Qwik's optimizer always resolves paths relative to process.cwd(), so we
 *   must return module IDs that are relative to process.cwd() for correct behavior.
 */
export function createInMemoryPlugin({
	entryPointId,
	processedFiles,
	vfile,
	cwd,
	resolveExtensions,
	debug,
}: InMemoryPluginOptions) {
	// Maps relative module IDs to their absolute file system paths (for loading)
	const moduleIdToAbsolutePath = new Map<string, string>();
	// Also map relative-to-cwd keys for processedFiles lookup
	const moduleIdToRelativeCwdPath = new Map<string, string>();

	/**
	 * Convert an absolute path to a relative module ID (relative to process.cwd())
	 * Qwik's optimizer always uses process.cwd() to resolve paths, so module IDs
	 * must be relative to process.cwd() for Qwik to generate correct file paths.
	 */
	const toModuleId = (absolutePath: string): string => {
		// Use process.cwd() as base for Qwik compatibility
		const moduleId = relative(process.cwd(), absolutePath);
		moduleIdToAbsolutePath.set(moduleId, absolutePath);
		// Also store the cwd-relative path for processedFiles lookup
		const cwdRelative = relative(cwd, absolutePath);
		moduleIdToRelativeCwdPath.set(moduleId, cwdRelative);
		return moduleId;
	};

	/**
	 * Convert a relative module ID back to an absolute path for file system operations
	 */
	const toAbsolutePath = (moduleId: string): string => {
		return moduleIdToAbsolutePath.get(moduleId) ?? resolve(process.cwd(), moduleId);
	};

	/**
	 * Get the cwd-relative path for a module ID (for processedFiles lookup)
	 */
	const toCwdRelativePath = (moduleId: string): string | undefined => {
		return moduleIdToRelativeCwdPath.get(moduleId);
	};

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

			// Calculate base directory for resolution
			// vfile.path is relative to cwd, importer may be relative to process.cwd()
			let baseDir: string;
			if (importer) {
				if (importer === entryPointId) {
					// vfile.path is relative to cwd, get its directory
					const vfilePath = vfile.path as string;
					const vfileDir = dirname(vfilePath);
					// Resolve relative to cwd to get absolute path for resolution
					baseDir = resolve(cwd, vfileDir);
				} else {
					// Importer is a module ID relative to process.cwd() - convert to absolute for resolution
					const absoluteImporter = isAbsolute(importer)
						? importer
						: toAbsolutePath(importer);
					baseDir = dirname(absoluteImporter);
				}
			} else {
				baseDir = cwd;
			}

			// Resolve the import to an absolute path
			const resolvedImportPath = resolve(baseDir, id);
			// Convert to cwd-relative for checking processedFiles (which uses cwd-relative keys)
			const cwdRelativeImportPath = relative(cwd, resolvedImportPath);
			// Convert to process.cwd()-relative for module ID (for Qwik compatibility)
			const moduleIdPath = relative(process.cwd(), resolvedImportPath);
			debug(
				`[inMemoryPlugin.resolveId] Resolved import path for '${id}': ${resolvedImportPath} (cwd-relative: ${cwdRelativeImportPath}, moduleId: ${moduleIdPath})`,
			);

			// 1. Check processedFiles (virtual file system) - direct match with cwd-relative key
			if (Object.hasOwn(processedFiles, cwdRelativeImportPath)) {
				// Store the mappings
				moduleIdToAbsolutePath.set(moduleIdPath, resolvedImportPath);
				moduleIdToRelativeCwdPath.set(moduleIdPath, cwdRelativeImportPath);
				debug(
					`[inMemoryPlugin.resolveId] Resolved '${id}' to '${moduleIdPath}' from processedFiles (direct key match).`,
				);
				return moduleIdPath;
			}

			const importPathLacksExtension = !extname(resolvedImportPath);

			// 2. Check processedFiles with extension resolution
			if (importPathLacksExtension) {
				const resolvedCwdRelativePath = findPathWithExt(
					cwdRelativeImportPath,
					resolveExtensions,
					processedFiles,
				);
				if (resolvedCwdRelativePath) {
					// resolvedCwdRelativePath is cwd-relative (from processedFiles keys)
					const absoluteFullPath = resolve(cwd, resolvedCwdRelativePath);
					const moduleId = relative(process.cwd(), absoluteFullPath);
					moduleIdToAbsolutePath.set(moduleId, absoluteFullPath);
					moduleIdToRelativeCwdPath.set(moduleId, resolvedCwdRelativePath);
					debug(
						`[inMemoryPlugin.resolveId] Resolved '${id}' to '${moduleId}' from processedFiles (added extension).`,
					);
					return moduleId;
				}
			}

			// 3. Fall back to file system (what esbuild does automatically for mdx-bundler)
			const fsPath = findFileSystemPathWithExt(
				resolvedImportPath,
				importPathLacksExtension ? resolveExtensions : [],
			);
			if (fsPath) {
				const moduleId = toModuleId(fsPath);
				debug(
					`[inMemoryPlugin.resolveId] Resolved '${id}' to '${moduleId}' from file system.`,
				);
				return moduleId;
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

			// Try to get the cwd-relative path for processedFiles lookup
			const cwdRelativePath = toCwdRelativePath(id);
			if (cwdRelativePath && Object.hasOwn(processedFiles, cwdRelativePath)) {
				debug(
					`[inMemoryPlugin.load] Loading content for '${id}' (cwd-relative: '${cwdRelativePath}') from processedFiles`,
				);
				return processedFiles[cwdRelativePath];
			}

			// Also try the id directly in case it was stored that way
			if (Object.hasOwn(processedFiles, id)) {
				debug(
					`[inMemoryPlugin.load] Loading content for '${id}' from processedFiles (direct)`,
				);
				return processedFiles[id];
			}

			// Fall back to file system using absolute path
			const absolutePath = toAbsolutePath(id);

			if (existsSync(absolutePath)) {
				const content = readFileSync(absolutePath, "utf-8");
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
