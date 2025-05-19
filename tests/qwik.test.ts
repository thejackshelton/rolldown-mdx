import * as Qwik from "@builder.io/qwik";
import { render } from "@noma.to/qwik-testing-library";
// @vitest-environment jsdom
import { describe, expect, test } from "vitest";
import { bundleMDX, createMDXComponent } from "../src/index";

describe("bundleMDX with Qwik", () => {
	test("comprehensive smoke test for qwik", async () => {
		const mdxSource = `
--- 
title: Example Qwik Post
published: 2023-10-27
description: This is some Qwik meta-data
---

# This is the Qwik title

import { MyDemo } from './my-demo'
import Another from './another.mdx'

Here's a **Qwik-powered** demo:

<MyDemo />
<Another />
`.trim();

		const myDemoTsx = `
import { component$ } from '@builder.io/qwik';
import { MySubDirComponent } from './sub/my-sub-dir';
import { someJsFunction } from './some-js-module';
import jsonData from './data.json';
import clsx from 'clsx'; // Import clsx

export const MyDemo = component$(() => {
  const showSpecialClass = true;
  return (
    <div class={clsx("my-demo-component", showSpecialClass && "special-qwik-class")}>
      Demo Content
      <MySubDirComponent>Sub dir content for Qwik!</MySubDirComponent>
      <p>JSON Data: {jsonData.message}</p>
      <div>JS Module Says: {someJsFunction()}</div>
    </div>
  );
});
`.trim();

		const mySubDirTsx = `
import { component$, Slot } from '@builder.io/qwik';

export const MySubDirComponent = component$(() => {
  return <div class="qwik-sub-dir"><Slot /></div>;
});
`.trim();

		const someJsModuleJs = `
export function someJsFunction() {
  return "Hello from JS Module for Qwik!";
}
`.trim();

		const dataJson = `{
  "message": "Hello from Qwik JSON!"
}`.trim();

		const anotherMdx = `
--- 
title: Another MDX for Qwik
---

## Sub MDX Title: {frontmatter.title}

This is another MDX component, Qwik style!
`.trim();

		const result = await bundleMDX({
			source: mdxSource,
			files: {
				"./my-demo.tsx": myDemoTsx,
				"./sub/my-sub-dir.tsx": mySubDirTsx,
				"./some-js-module.js": someJsModuleJs,
				"./data.json": dataJson,
				"./another.mdx": anotherMdx,
			},
			framework: "qwik",
			debug: true,
		});

		expect(result.errors).toEqual([]);
		expect(result.warnings).toEqual([]);

		const frontmatter = result.frontmatter as {
			title: string;
			description: string;
			published: Date;
		};

		expect(frontmatter).toEqual({
			title: "Example Qwik Post",
			published: new Date(Date.UTC(2023, 9, 27)),
			description: "This is some Qwik meta-data",
		});

		const Component = createMDXComponent<
			Record<string, unknown>,
			Qwik.JSXOutput
		>(result, Qwik);

		const SpanBold = (props: Qwik.PropsOf<"span">) => {
			return Qwik.jsx("span", {
				style: "font-weight: bold; color: blue;",
				children: props.children,
			});
		};

		const { container } = await render(
			Qwik.jsx(Component, { components: { strong: SpanBold } }),
		);

		const expectedHtmlStructure = `<h1>This is the Qwik title</h1>
<p>Here's a <span style="font-weight: bold; color: blue;">Qwik-powered</span> demo:</p>
<!--qv --><div class="my-demo-component special-qwik-class">Demo Content<div class="qwik-sub-dir"><!--qv -->Sub dir content for Qwik!<!--/qv--></div><p>JSON Data: Hello from Qwik JSON!</p><div>JS Module Says: Hello from JS Module for Qwik!</div></div><!--/qv-->
<!--qv --><h2>Sub MDX Title: Another MDX for Qwik</h2>
<p>This is another MDX component, Qwik style!</p><!--/qv-->`;

		expect(container.innerHTML).toEqual(expectedHtmlStructure);
	});
});
