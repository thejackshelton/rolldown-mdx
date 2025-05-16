import { describe, test, expect } from "vitest";
import * as Qwik from "@builder.io/qwik";
import { render } from "@noma.to/qwik-testing-library";
import { bundleMDX, type MdxJsxConfig } from "../src/index";
import { getMDXComponent } from "../src/client/jsx";

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

	// This is the config that getMDXComponent will use for its execution scope
	const jsxComponentConfig = {
		Qwik,
		_jsx_runtime: {
			jsx: Qwik.jsx,
			jsxs: Qwik.jsx, // Qwik's jsx function handles both from v0.17+
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
				// These should align with jsxComponentConfig keys for externalization
				"@builder.io/qwik": "Qwik",
				"@builder.io/qwik/jsx-runtime": "_jsx_runtime",
			},
		});

		expect(result.errors).toEqual([]);
		expect(result.warnings).toEqual([]); // Or handle expected warnings if any

		const Component = getMDXComponent(result.code, jsxComponentConfig);

		const SpanBold = Qwik.component$(() => {
			return Qwik.jsx("span", {
				class: "strong",
				children: Qwik.jsx(Qwik.Slot, { name: "" }),
			});
		});

		// Frontmatter dates are not automatically converted to Date objects by default by gray-matter
		// or our current setup. Original mdx-bundler might have special handling.
		// For now, we expect string dates or adjust if date parsing is added.
		expect(result.frontmatter).toEqual({
			title: "Example Post",
			published: "2021-02-13", // Dates are strings unless parsed
			description: "This is some meta-data",
		});

		const { container } = await render(
			Qwik.jsx(Component, { components: { strong: SpanBold } }),
		);

		// Qwik's output contains HTML comments for resumability markers.
		// This expected output is specific to Qwik v1.x.
		// It might change in Qwik v2.
		// The exact structure of comments <!--qv X--> can vary.
		// Using .toContain or regex might be more robust if exact comment content is unstable.
		const expectedHTML = `<h1>This is the title</h1>
<p>Here's a <!--qv--><span class="strong"><!--qv q:key q:sref=0 q:s-->neat<!--/qv--></span><!--/qv--> demo:</p>
<!--qv--><div>mdx-bundler with Qwik's runtime!</div><!--/qv-->`;

		// Normalize HTML for comparison (remove extra whitespace between tags, etc.)
		const normalizeHTML = (html: string) =>
			html.replace(/\n\s*/g, "").replace(/>\s+</g, "><").trim();

		expect(normalizeHTML(container.innerHTML)).toBe(
			normalizeHTML(expectedHTML),
		);
	});
});
