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

<p>Here\'s a <span style="font-weight: bold; color: blue;">Qwik-powered</span> demo:</p>
<!--qv --><div class="my-demo-component special-qwik-class">Demo Content<!--qv --><div class="qwik-sub-dir"><!--qv q:key q:sref=1 q:s-->Sub dir content for Qwik!<!--/qv--></div><!--/qv--><p>JSON Data: Hello from Qwik JSON!</p><div>JS Module Says: Hello from JS Module for Qwik!</div></div><!--/qv-->
<h2>Sub MDX Title: Another MDX for Qwik</h2>
<p>This is another MDX component, Qwik style!</p>`;

		expect(container.innerHTML).toEqual(expectedHtmlStructure);
	});

	test("should error when mdxSource imports a non-existent file", async () => {
		const mdxSource = `
import NonExistent from './non-existent-component'

<NonExistent />
`;
		try {
			await bundleMDX({
				source: mdxSource,
				files: {},
				framework: "qwik",
			});
			expect(true).toBe(false); // Should not reach here, bundleMDX should throw
		} catch (e: unknown) {
			// The following error output to stderr from bundleMDX is expected and verified by this test.
			let errorMessage =
				"Error did not have a message property or was not an Error instance.";
			if (e instanceof Error) {
				errorMessage = e.message;
			} else if (typeof e === "object" && e !== null && "message" in e) {
				const potentialError = e as { message?: unknown };
				if (typeof potentialError.message === "string") {
					errorMessage = potentialError.message;
				} else {
					errorMessage = JSON.stringify(e);
				}
			} else if (typeof e === "string") {
				errorMessage = e;
			} else {
				errorMessage = JSON.stringify(e);
			}
			expect(errorMessage).toMatch(
				/Could not resolve '\.\/non-existent-component'/,
			);
			expect(errorMessage).toMatch(/entry\.mdx/);
		}
	});

	test("should error when a file in 'files' imports a non-existent file", async () => {
		const mdxSource = `
import MyComponent from './my-component.tsx'

<MyComponent />
`;
		const myComponentTsx = `
import { component$ } from '@builder.io/qwik';
import NonExistentNested from './non-existent-nested-import';

const MyComponentInternal = component$(() => {
  // @ts-expect-error NonExistentNested is not defined
  return <div>Hello <NonExistentNested /></div>;
});
export default MyComponentInternal;
`;
		try {
			await bundleMDX({
				source: mdxSource,
				files: {
					"./my-component.tsx": myComponentTsx,
				},
				framework: "qwik",
				debug: false,
			});
			expect(true).toBe(false); // Should not reach here
		} catch (e: unknown) {
			// The following error output to stderr from bundleMDX is expected and verified by this test.
			let errorMessage =
				"Error did not have a message property or was not an Error instance.";
			if (e instanceof Error) {
				errorMessage = e.message;
			} else if (typeof e === "object" && e !== null && "message" in e) {
				const potentialError = e as { message?: unknown };
				if (typeof potentialError.message === "string") {
					errorMessage = potentialError.message;
				} else {
					errorMessage = JSON.stringify(e);
				}
			} else if (typeof e === "string") {
				errorMessage = e;
			} else {
				errorMessage = JSON.stringify(e);
			}
			expect(errorMessage).toMatch(
				/Could not resolve '\.\/non-existent-nested-import'/,
			);
			expect(errorMessage).toMatch(/my-component\.tsx/);
		}
	});

	test("should error when importing a file with an unsupported extension", async () => {
		const mdxSource = `
import BadFile from './bad-file.unsupportedext'

<BadFile />
`;
		try {
			await bundleMDX({
				source: mdxSource,
				files: {
					"./bad-file.unsupportedext": "some content that is not valid js/ts",
				},
				framework: "qwik",
				debug: false,
			});
			expect(true).toBe(false); // Should not reach here
		} catch (e: unknown) {
			// The following error output to stderr from bundleMDX is expected and verified by this test.
			let errorMessage =
				"Error did not have a message property or was not an Error instance.";
			if (e instanceof Error) {
				errorMessage = e.message;
			} else if (typeof e === "object" && e !== null && "message" in e) {
				const potentialError = e as { message?: unknown };
				if (typeof potentialError.message === "string") {
					errorMessage = potentialError.message;
				} else {
					errorMessage = JSON.stringify(e);
				}
			} else if (typeof e === "string") {
				errorMessage = e;
			} else {
				errorMessage = JSON.stringify(e);
			}
			expect(errorMessage).toMatch(
				/Expected a semicolon|parse error|syntax error/i,
			);
			expect(errorMessage).toMatch(/bad-file\.unsupportedext/);
		}
	});
});
