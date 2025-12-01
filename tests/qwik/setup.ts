import * as Qwik from "@builder.io/qwik";
import type { FrameworkImport } from "rolldown-mdx";
import { render } from "vitest-browser-qwik";
import type {
	MDXComponent,
	RenderResult,
	TestedFramework,
} from "../vitest.d.ts";

export const framework: TestedFramework = "qwik";

interface RenderContext {
	render: (element: Qwik.JSXOutput) => RenderResult;
	jsx: (
		Component: MDXComponent,
		props?: Record<string, unknown>,
	) => Qwik.JSXOutput;
	Runtime: FrameworkImport;
}

export const getRenderContext = (): RenderContext => ({
	render,
	jsx: (Component, props) =>
		Qwik.jsx(Component as Qwik.FunctionComponent, props ?? {}),
	Runtime: Qwik,
});
