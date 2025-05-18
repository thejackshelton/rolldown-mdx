import * as Qwik from "@builder.io/qwik";
import { qwikRollup } from "@builder.io/qwik/optimizer";
import { render } from "@noma.to/qwik-testing-library";
// @vitest-environment jsdom
import { describe, expect, test } from "vitest";
import { type MdxJsxConfig, bundleMDX, getMDXComponent } from "../src/index";

describe("bundleMDX with Qwik", () => {
	const jsxBundlerConfig: MdxJsxConfig = {
		jsxLib: {
			varName: "Qwik",
			package: "@builder.io/qwik",
		},
		jsxRuntime: {
			varName: "_jsx_runtime",
			package: "@builder.io/qwik/jsx-runtime",
		},
	};

	const jsxComponentConfig = {
		Qwik,
		_jsx_runtime: {
			jsx: Qwik.jsx,
			jsxs: Qwik.jsx,
			Fragment: Qwik.Fragment,
		},
	};

	const mdxSource = `
---
title: Example Post
published: 2021-02-13
description: This is some meta-data
---
import { Demo } from './demo'

# This is the title

Here's a **neat** demo:
<Demo />
  `.trim();

	const demoTsx = `
  import { component$ } from '@builder.io/qwik';

  export const Demo = component$(() => {
  return <div>mdx-bundler with Qwik's runtime!</div>;
});
  `.trim();

	test("smoke test for qwik", async () => {
		const result = await bundleMDX({
			source: mdxSource,
			jsxConfig: jsxBundlerConfig,
			files: {
				"./demo.tsx": demoTsx,
			},
			globals: {
				"@builder.io/qwik": "Qwik",
				"@builder.io/qwik/jsx-runtime": "_jsx_runtime",
			},
			debug: true,
			rolldown: {
				plugins: [
					qwikRollup({
						entryStrategy: { type: "inline" },
					}),
				],
			},
		});

		expect(result.errors).toEqual([]);
		expect(result.warnings).toEqual([]);

		const Component = getMDXComponent<Record<string, unknown>, Qwik.JSXOutput>(
			result.code,
			jsxComponentConfig,
		);

		const SpanBold = (props: Qwik.PropsOf<"span">) => {
			return Qwik.jsx("span", {
				class: "strong",
				children: props.children,
			});
		};

		expect(result.frontmatter).toEqual({
			title: "Example Post",
			published: new Date(Date.UTC(2021, 1, 13)),
			description: "This is some meta-data",
		});

		const { container } = await render(
			Qwik.jsx(Component, { components: { strong: SpanBold } }),
		);

		const expectedHTML = `<h1>This is the title</h1>
<p>Here's a <span class="strong">neat</span> demo:</p>
<!--qv --><div>mdx-bundler with Qwik's runtime!</div><!--/qv-->`;

		expect(container.innerHTML).toBe(expectedHTML);
	});
});
