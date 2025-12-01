import * as React from "react";
import { render } from "vitest-browser-react";

export const framework = "react" as const;

export const getRenderContext = () => ({
	render,
	jsx: (
		Component: (props: Record<string, unknown>) => React.ReactNode,
		props?: Record<string, unknown>,
	) => React.createElement(Component, props),
	Runtime: React,
});
