// @vitest-environment jsdom
import { describe, test, expect } from "vitest";
import * as Qwik from "@builder.io/qwik";
import { render } from "@noma.to/qwik-testing-library";
import { bundleMDX, type MdxJsxConfig } from "../src/index";
import { getMDXComponent } from "../src/jsx";
import * as QwikJsxRuntime from "@builder.io/qwik/jsx-runtime";

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
		// This is the globals configuration for bundleMDX itself.
		// The KEYS here determine what becomes `require('key')` in the CJS output.
		const bundleOptionsGlobals = {
			"@builder.io/qwik": "Qwik", // Value is for Rolldown's legacy UMD/IIFE, less critical for CJS externals
			"@builder.io/qwik/jsx-runtime": "_jsx_runtime", // Same as above
		};

		const { code, frontmatter } = await bundleMDX({
			source: mdxSource,
			files: {
				"./demo.tsx": demoTsx,
			},
			globals: bundleOptionsGlobals, // Use the defined globals for bundling
			jsxConfig: jsxBundlerConfig,
		});

		expect(code).toEqual(expect.any(String));
		expect(frontmatter).toEqual({
			title: "Example Post",
			published: new Date(Date.UTC(2021, 1, 13)), // Dates are parsed into Date objects by gray-matter
			description: "This is some meta-data",
		});

		// THIS IS THE CRUCIAL PART:
		// The keys in THIS globals object for getMDXComponent MUST MATCH
		// the strings that will be require()'d by the CJS bundle.
		const executionTimeGlobals = {
			"@builder.io/qwik": Qwik, // Key is the string '@builder.io/qwik'
			"@builder.io/qwik/jsx-runtime": QwikJsxRuntime, // Key is the string '@builder.io/qwik/jsx-runtime'
		};

		const Component = getMDXComponent(code, executionTimeGlobals);

		const SpanBold = (props: { children?: any }) => {
			return Qwik.jsx("span", {
				class: "strong",
				children: props.children,
			});
		};

		const { container } = await render(
			Qwik.jsx(Component, { components: { strong: SpanBold } }),
		);

		// Qwik's output contains HTML comments for resumability markers.
		// This expected output is specific to Qwik v1.x.
		// It might change in Qwik v2.
		// The exact structure of comments <!--qv X--> can vary.
		// Using .toContain or regex might be more robust if exact comment content is unstable.
		const expectedHTML = `<h1>This is the title</h1><p>Here's a <span class="strong">neat</span> demo:</p><!--qv --><div>mdx-bundler with Qwik's runtime!</div><!--/qv-->`;

		// Normalize HTML for comparison (remove extra whitespace between tags, etc.)
		const normalizeHTML = (html: string) =>
			html.replace(/\n\s*/g, "").replace(/>\s+</g, "><").trim();

		expect(normalizeHTML(container.innerHTML)).toBe(
			normalizeHTML(expectedHTML),
		);
	});
});
