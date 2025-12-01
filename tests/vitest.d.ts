import type { BundleMDXResult, SupportedFramework } from "rolldown-mdx";
import type { Locator } from "vitest/browser";

/**
 * Frameworks that have test implementations.
 * This is a subset of SupportedFramework from the library.
 */
export type TestedFramework = Extract<SupportedFramework, "qwik" | "react">;

/**
 * Generic MDX component type returned by createMDXComponent.
 * Props default to Record<string, unknown>, return type is unknown.
 */
export type MDXComponent<Props = Record<string, unknown>> = (props: Props) => unknown;

/** Render result from vitest-browser-* */
export interface RenderResult {
	getByText(text: string | RegExp): Locator;
	getByRole(role: string, options?: { name?: string | RegExp }): Locator;
	container: HTMLElement;
}

/** Browser command options - derives framework type from library */
export interface BundleOptions {
	source: string;
	files?: Record<string, string>;
	framework: TestedFramework;
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
