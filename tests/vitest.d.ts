import type { Locator } from "vitest/browser";
import type { BundleMDXResult } from "rolldown-mdx";

// Render result from vitest-browser-*
interface RenderResult {
	getByText(text: string | RegExp): Locator;
	getByRole(role: string, options?: { name?: string | RegExp }): Locator;
	container: HTMLElement;
}

// Browser command types
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

// Vitest assertion extensions
declare module "vitest" {
	interface Assertion<T> {
		toBeVisible(): Promise<void>;
	}

	interface ExpectStatic {
		element(locator: Locator | HTMLElement | null): Assertion<unknown>;
	}
}
