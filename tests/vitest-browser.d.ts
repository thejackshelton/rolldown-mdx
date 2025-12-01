import type { Locator } from "vitest/browser";

interface RenderResult {
	getByText(text: string | RegExp): Locator;
	getByRole(role: string, options?: { name?: string | RegExp }): Locator;
	container: HTMLElement;
}

declare module "vitest-browser-qwik" {
	export function render(element: unknown): Promise<RenderResult>;
}

declare module "vitest-browser-react" {
	export function render(element: unknown): Promise<RenderResult>;
}

declare module "vitest" {
	interface Assertion<T> {
		toBeVisible(): Promise<void>;
	}

	interface ExpectStatic {
		element(locator: Locator | HTMLElement | null): Assertion<unknown>;
	}
}
