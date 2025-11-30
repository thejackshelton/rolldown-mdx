import { qwikRollup } from "@builder.io/qwik/optimizer";
import type { RolldownPluginOption } from "rolldown";

type DebugFn = (...args: unknown[]) => void;

export interface QwikIntegrationOptions {
	cwd: string;
}

/**
 * This integration adds the Qwik compiler out of the box, so that
 * consumers that select the qwik option don't have to add it themselves.
 */
export function qwikIntegration(
	currentPlugins: RolldownPluginOption[],
	defaultPluginsFromBundleMDX: readonly RolldownPluginOption[],
	debug: DebugFn,
	options: QwikIntegrationOptions,
): RolldownPluginOption[] {
	const userAlreadyHasQwikPlugin = currentPlugins.some(
		(p) =>
			p && typeof p === "object" && "name" in p && p.name === "qwik-rollup",
	);

	if (userAlreadyHasQwikPlugin) {
		debug("[rolldown-mdx:qwik] User has qwik-rollup plugin. Skipping.");
		return currentPlugins;
	}

	debug("[rolldown-mdx:qwik] Automatically adding qwikRollup plugin.");
	const qwikPluginInstance = qwikRollup({
		entryStrategy: { type: "inline" },
		buildMode: "production",
		rootDir: options.cwd,
		srcDir: options.cwd,
	}) as RolldownPluginOption;

	const defaultPluginCount = defaultPluginsFromBundleMDX.length;
	const head = currentPlugins.slice(0, defaultPluginCount);
	const tail = currentPlugins.slice(defaultPluginCount);

	return [...head, qwikPluginInstance, ...tail];
}
