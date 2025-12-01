import * as React from "react";
import { render } from "vitest-browser-react";

export const framework = "react" as const;

// biome-ignore lint/suspicious/noExplicitAny: Dynamic component types
type ComponentType = any;
// biome-ignore lint/suspicious/noExplicitAny: Dynamic props types
type PropsType = any;

export const getRenderContext = () => ({
	render,
	createElement: (Component: ComponentType, props?: PropsType) =>
		React.createElement(Component, props ?? {}),
	Runtime: React,
});
