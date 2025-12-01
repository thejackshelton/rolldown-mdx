import type { RolldownPluginOption } from "rolldown";

type DebugFn = (...args: unknown[]) => void;

/**
 * This integration adds the Qwik compiler out of the box, so that
 * consumers that select the qwik option don't have to add it themselves.
 */
export async function qwikIntegration(
	currentPlugins: RolldownPluginOption[],
	defaultPluginsFromBundleMDX: readonly RolldownPluginOption[],
	debug: DebugFn,
): Promise<RolldownPluginOption[]> {
	let qwikRollupFn: ((options?: object) => RolldownPluginOption) | null = null;

	try {
		const optimizer = await import("@builder.io/qwik/optimizer");
		if (optimizer && typeof optimizer.qwikRollup === "function") {
			qwikRollupFn = optimizer.qwikRollup;
		} else {
			debug(
				"[rolldown-mdx:qwik] qwikRollup function not found or not a function.",
			);
			console.warn("rolldown-mdx: Qwik optimizer issue. Auto-config may fail.");
			return currentPlugins;
		}
	} catch (e) {
		debug(
			"[rolldown-mdx:qwik] Failed to import '@builder.io/qwik/optimizer'.",
			e,
		);
		console.warn(
			"rolldown-mdx: Install '@builder.io/qwik/optimizer' for Qwik auto-config.",
		);
		return currentPlugins;
	}

	if (!qwikRollupFn) {
		return currentPlugins;
	}

	const userAlreadyHasQwikPlugin = currentPlugins.some(
		(p) =>
			p && typeof p === "object" && "name" in p && p.name === "qwik-rollup",
	);

	if (userAlreadyHasQwikPlugin) {
		debug("[rolldown-mdx:qwik] User has qwik-rollup plugin. Skipping.");
		return currentPlugins;
	}

	debug("[rolldown-mdx:qwik] Automatically adding qwikRollup plugin.");
	const qwikPluginInstance = qwikRollupFn({
		entryStrategy: { type: "inline" },
	}) as RolldownPluginOption;

	const defaultPluginCount = defaultPluginsFromBundleMDX.length;
	const head = currentPlugins.slice(0, defaultPluginCount);
	const tail = currentPlugins.slice(defaultPluginCount);

	return [...head, qwikPluginInstance, ...tail];
}
