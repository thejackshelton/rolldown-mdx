import type { BundleMDXResult } from "../src/index";

interface BundleOptions {
	source: string;
	files?: Record<string, string>;
	framework: "qwik" | "react";
}

declare module "vitest/browser" {
	interface BrowserCommands {
		bundle: (options: BundleOptions) => Promise<BundleMDXResult>;
	}
}
