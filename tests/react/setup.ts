import * as React from "react";
import type { FrameworkImport } from "rolldown-mdx";
import { render } from "vitest-browser-react";
import type {
	MDXComponent,
	RenderResult,
	TestedFramework,
} from "../vitest.d.ts";

export const framework: TestedFramework = "react";

interface RenderContext {
	render: (element: React.ReactNode) => Promise<RenderResult>;
	jsx: (
		Component: MDXComponent,
		props?: Record<string, unknown>,
	) => React.ReactNode;
	Runtime: FrameworkImport;
}

export const getRenderContext = (): RenderContext => ({
	render,
	jsx: (Component, props) =>
		React.createElement(
			Component as (props: Record<string, unknown>) => React.ReactNode,
			props,
		),
	Runtime: React,
});
