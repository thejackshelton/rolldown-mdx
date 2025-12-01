declare module "react/jsx-runtime" {
	export const jsx: any;
	export const jsxs: any;
	export const Fragment: any;
}

declare module "react" {
	export const useState: <T>(initial: T) => [T, (value: T | ((prev: T) => T)) => void];
	export const createElement: any;
	export const Fragment: any;
	export type ReactNode = any;
}

declare namespace JSX {
	interface IntrinsicElements {
		[elemName: string]: any;
	}
}

