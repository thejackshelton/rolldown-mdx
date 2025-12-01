import * as Qwik from "@builder.io/qwik";
import { render } from "vitest-browser-qwik";

export const framework = "qwik" as const;

// biome-ignore lint/suspicious/noExplicitAny: Dynamic component types
type ComponentType = any;
// biome-ignore lint/suspicious/noExplicitAny: Dynamic props types
type PropsType = any;

export const getRenderContext = () => ({
	render,
	createElement: (Component: ComponentType, props?: PropsType) =>
		Qwik.jsx(Component, props ?? {}),
	Runtime: Qwik,
});
