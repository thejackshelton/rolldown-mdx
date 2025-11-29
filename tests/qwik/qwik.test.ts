import path from "node:path";
import * as Qwik from "@builder.io/qwik";
import { render } from "@noma.to/qwik-testing-library";
import { VFile } from "vfile";
// @vitest-environment jsdom
import { describe, expect, test } from "vitest";
import { bundleMDX, createMDXComponent } from "../../src/index";

describe("bundleMDX with file option", () => {
	const fixturesDir = __dirname;

	test("reads MDX from disk and resolves relative imports", async () => {
		const result = await bundleMDX({
			file: "content/test-post.mdx",
			cwd: fixturesDir,
			framework: "qwik",
		});

		expect(result.errors).toEqual([]);
		expect(result.code).toContain("counter-component");
		expect(result.code).toContain("greeting-component");
		expect(result.frontmatter).toEqual({
			title: "Test Post",
			author: "Test Author",
		});
	});

	test("works with absolute file path", async () => {
		const absolutePath = path.join(fixturesDir, "content/test-post.mdx");

		const result = await bundleMDX({
			file: absolutePath,
			framework: "qwik",
		});

		expect(result.errors).toEqual([]);
		expect(result.code).toContain("counter-component");
		expect(result.frontmatter.title).toBe("Test Post");
	});

	test("throws when both source and file are provided", async () => {
		await expect(
			bundleMDX({
				source: "# Hello",
				file: "content/test-post.mdx",
				cwd: fixturesDir,
				framework: "qwik",
			}),
		).rejects.toThrow("Cannot specify both 'source' and 'file'");
	});

	test("throws when neither source nor file are provided", async () => {
		await expect(
			bundleMDX({
				framework: "qwik",
			}),
		).rejects.toThrow("Must specify either 'source' or 'file'");
	});

	test("throws when file doesn't exist", async () => {
		await expect(
			bundleMDX({
				file: "nonexistent.mdx",
				cwd: fixturesDir,
				framework: "qwik",
			}),
		).rejects.toThrow("ENOENT");
	});

	test("resolves imports from file directory, not cwd", async () => {
		const result = await bundleMDX({
			file: path.join(fixturesDir, "content/test-post.mdx"),
			cwd: process.cwd(),
			framework: "qwik",
		});

		expect(result.errors).toEqual([]);
		expect(result.code).toContain("counter-component");
	});

	test("works with files map alongside file option", async () => {
		const result = await bundleMDX({
			file: "content/test-post.mdx",
			cwd: fixturesDir,
			files: {
				"./components/counter.tsx": `
import { component$ } from "@builder.io/qwik";

export const Counter = component$(() => {
	return <div class="overridden-counter">Overridden Counter</div>;
});
				`.trim(),
			},
			framework: "qwik",
		});

		expect(result.errors).toEqual([]);
		expect(result.code).toContain("overridden-counter");
		expect(result.code).toContain("greeting-component");
	});
});

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
import clsx from 'clsx';

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
			throw new Error(
				"bundleMDX was expected to throw an error, but it resolved successfully.",
			);
		} catch (e: unknown) {
			if (!(e instanceof Error)) {
				throw new Error(`Caught a non-Error throwable: ${JSON.stringify(e)}`);
			}
			expect(e.message).toMatch(
				/Could not resolve '\.\/non-existent-component'/,
			);
			expect(e.message).toMatch(/entry\.mdx/);
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
			});
			throw new Error(
				"bundleMDX was expected to throw an error, but it resolved successfully.",
			);
		} catch (e: unknown) {
			if (!(e instanceof Error)) {
				throw new Error(`Caught a non-Error throwable: ${JSON.stringify(e)}`);
			}
			expect(e.message).toMatch(
				/Could not resolve '\.\/non-existent-nested-import'/,
			);
			expect(e.message).toMatch(/my-component\.tsx/);
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
			});
			throw new Error(
				"bundleMDX was expected to throw an error, but it resolved successfully.",
			);
		} catch (e: unknown) {
			if (!(e instanceof Error)) {
				throw new Error(`Caught a non-Error throwable: ${JSON.stringify(e)}`);
			}
			expect(e.message).toMatch(
				/Expected a semicolon|parse error|syntax error/i,
			);
			expect(e.message).toMatch(/bad-file\.unsupportedext/);
		}
	});
});

test("files is optional", async () => {
	const result = await bundleMDX({ source: "# Hello", framework: "qwik" });
	expect(result.errors).toEqual([]);
	expect(result.code).toContain("Hello");
});

test("processes TypeScript and TSX files correctly for Qwik", async () => {
	const mdxSource = `
import Demo from './demo.tsx'

<Demo />
  `.trim();

	const demoQwikTsx = `
import { component$ } from '@builder.io/qwik';
import { getConditionalClasses } from './classUtils';

const MyDemoComponent = component$(() => {
  const isActive = true;
  const hasError = false;
  return <div class={getConditionalClasses(isActive, hasError)}>Dynamic Classes Test</div>;
});

export default MyDemoComponent;
  `.trim();

	const classUtilsTs = `
import clsx from 'clsx';

export const getConditionalClasses = (isActive: boolean, hasError: boolean): string => {
  return clsx('base-style', {
    'active-style': isActive,
    'error-style': hasError,
    'another-style': true,
  });
};
  `.trim();

	const result = await bundleMDX({
		source: mdxSource,
		files: {
			"./demo.tsx": demoQwikTsx,
			"./classUtils.ts": classUtilsTs,
		},
		framework: "qwik",
	});

	expect(result.errors).toEqual([]);
	expect(result.warnings).toEqual([]);

	const Component = createMDXComponent<Record<string, unknown>, Qwik.JSXOutput>(
		result,
		Qwik,
	);

	const { container } = await render(Qwik.jsx(Component, {}));

	const divElement = container.querySelector("div");
	expect(divElement).not.toBeNull();
	if (divElement) {
		expect(divElement.classList.contains("base-style")).toBe(true);
		expect(divElement.classList.contains("active-style")).toBe(true);
		expect(divElement.classList.contains("another-style")).toBe(true);
		expect(divElement.classList.contains("error-style")).toBe(false);
		expect(divElement.textContent).toBe("Dynamic Classes Test");
	}
});

test("can use a 'files' entry to override a 'node_modules' import for Qwik", async () => {
	const myTestComponentTsx = `
import { component$ } from '@builder.io/qwik';
import myMockedClsx from 'clsx';

export const MyTestComponent = component$(() => {
  const classes = myMockedClsx('foo', { bar: true });
  return <div class={classes}>Mocked clsx output: {classes}</div>;
});
	`.trim();

	const mdxSource = `
import { MyTestComponent } from './my-test-component.tsx'

<MyTestComponent />
  `.trim();

	const mockClsxImplementation = `
export default function mockedClsx(...args) {
  return "mocked-clsx-was-definitely-used";
};
  `.trim();

	const result = await bundleMDX({
		source: mdxSource,
		files: {
			clsx: mockClsxImplementation,
			"./my-test-component.tsx": myTestComponentTsx,
		},
		framework: "qwik",
	});

	expect(result.errors).toEqual([]);
	expect(result.warnings).toEqual([]);

	const Component = createMDXComponent<Record<string, unknown>, Qwik.JSXOutput>(
		result,
		Qwik,
	);

	const { container } = await render(Qwik.jsx(Component, {}));

	const divElement = container.querySelector(
		".mocked-clsx-was-definitely-used",
	);
	expect(divElement).not.toBeNull();
	if (divElement) {
		expect(divElement.textContent).toBe(
			"Mocked clsx output: mocked-clsx-was-definitely-used",
		);
	}
});

describe("file system fallback", () => {
	const fixturesDir = __dirname;

	test("resolves imports from file system when not in files map", async () => {
		const mdxSource = `
import { Counter } from "./components/counter.tsx";

# File System Test

<Counter />
`.trim();

		const result = await bundleMDX({
			source: mdxSource,
			cwd: fixturesDir,
			framework: "qwik",
		});

		expect(result.errors).toEqual([]);
		expect(result.code).toContain("counter-component");
		expect(result.code).toContain("count-value");
	});

	test("resolves imports without extension from file system", async () => {
		const mdxSource = `
import { Greeting } from "./components/greeting";

# Extension Resolution Test

<Greeting name="Test User" />
`.trim();

		const result = await bundleMDX({
			source: mdxSource,
			cwd: fixturesDir,
			framework: "qwik",
		});

		expect(result.errors).toEqual([]);
		expect(result.code).toContain("greeting-component");
	});

	test("resolves TypeScript utility imports from file system", async () => {
		const mdxSource = `
import { formatMessage, GREETING_PREFIX } from "./utils/helpers";

# Helper Functions

export const message = formatMessage("Test");
export const prefix = GREETING_PREFIX;
`.trim();

		const result = await bundleMDX({
			source: mdxSource,
			cwd: fixturesDir,
			framework: "qwik",
		});

		expect(result.errors).toEqual([]);
		expect(result.code).toContain("formatMessage");
		expect(result.code).toContain("GREETING_PREFIX");
	});

	test("resolves JSON imports from file system", async () => {
		const mdxSource = `
import config from "./data/config.json";

# JSON Import Test

App: {config.appName}
`.trim();

		const result = await bundleMDX({
			source: mdxSource,
			cwd: fixturesDir,
			framework: "qwik",
		});

		expect(result.errors).toEqual([]);
		expect(result.code).toContain("File System Test App");
	});

	test("in-memory files take priority over file system", async () => {
		const mdxSource = `
import { Counter } from "./components/counter.tsx";

# Priority Test

<Counter />
`.trim();

		const inMemoryCounter = `
import { component$ } from "@builder.io/qwik";

export const Counter = component$(() => {
	return <div class="in-memory-counter">In-Memory Counter Override</div>;
});
`.trim();

		const result = await bundleMDX({
			source: mdxSource,
			cwd: fixturesDir,
			files: {
				"./components/counter.tsx": inMemoryCounter,
			},
			framework: "qwik",
		});

		expect(result.errors).toEqual([]);
		expect(result.code).toContain("in-memory-counter");
		expect(result.code).toContain("In-Memory Counter Override");
		expect(result.code).not.toContain("count-value");
	});

	test("resolves nested file system imports from file system components", async () => {
		const mdxSource = `
import { MyWrapper } from "./my-wrapper.tsx";

# Nested Import Test

<MyWrapper />
`.trim();

		const myWrapper = `
import { component$ } from "@builder.io/qwik";
import { Greeting } from "./components/greeting";
import { formatMessage } from "./utils/helpers";

export const MyWrapper = component$(() => {
	const msg = formatMessage("Nested test");
	return (
		<div class="my-wrapper">
			<Greeting name="Nested" />
			<p>{msg}</p>
		</div>
	);
});
`.trim();

		const result = await bundleMDX({
			source: mdxSource,
			cwd: fixturesDir,
			files: {
				"./my-wrapper.tsx": myWrapper,
			},
			framework: "qwik",
		});

		expect(result.errors).toEqual([]);
		expect(result.code).toContain("my-wrapper");
		expect(result.code).toContain("greeting-component");
		expect(result.code).toContain("formatMessage");
	});

	test("works with VFile source and cwd", async () => {
		const mdxContent = `
import { Counter } from "./components/counter";

# VFile Test

<Counter />
`.trim();

		const vfile = new VFile({
			value: mdxContent,
			path: path.join(fixturesDir, "test-doc.mdx"),
		});

		const result = await bundleMDX({
			source: vfile,
			framework: "qwik",
		});

		expect(result.errors).toEqual([]);
		expect(result.code).toContain("counter-component");
	});

	test("mixed in-memory and file system imports work together", async () => {
		const mdxSource = `
import { Counter } from "./components/counter";
import { CustomComponent } from "./custom.tsx";
import config from "./data/config.json";

# Mixed Imports Test

<Counter />
<CustomComponent appName={config.appName} />
`.trim();

		const customComponent = `
import { component$ } from "@builder.io/qwik";
import { formatMessage } from "./utils/helpers";

export const CustomComponent = component$(({ appName }) => {
	return <div class="custom-component">{formatMessage(appName)}</div>;
});
`.trim();

		const result = await bundleMDX({
			source: mdxSource,
			cwd: fixturesDir,
			files: {
				"./custom.tsx": customComponent,
			},
			framework: "qwik",
		});

		expect(result.errors).toEqual([]);
		expect(result.code).toContain("counter-component");
		expect(result.code).toContain("File System Test App");
		expect(result.code).toContain("custom-component");
		expect(result.code).toContain("formatMessage");
	});
});
