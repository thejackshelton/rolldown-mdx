import * as Qwik from "@builder.io/qwik";
import { render } from "vitest-browser-qwik";

export const framework = "qwik" as const;

type AnyComponent = (props: Record<string, unknown>) => unknown;

export const getRenderContext = () => ({
	render,
	jsx: (Component: AnyComponent, props?: Record<string, unknown>) =>
		Qwik.jsx(Component as Qwik.Component, props ?? {}),
	Runtime: Qwik,
});
