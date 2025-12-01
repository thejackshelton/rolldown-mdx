declare module "#setup" {
	export const framework: "qwik" | "react";
	export function getRenderContext(): {
		// biome-ignore lint/suspicious/noExplicitAny: Framework-specific render
		render: any;
		// biome-ignore lint/suspicious/noExplicitAny: Framework-specific createElement
		createElement: (Component: any, props?: any) => any;
		// biome-ignore lint/suspicious/noExplicitAny: Framework runtime
		Runtime: any;
	};
}

