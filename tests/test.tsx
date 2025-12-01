import { describe, expect, test } from "vitest";
import { commands } from "vitest/browser";
import { framework, getRenderContext } from "#setup";
import { createMDXComponent } from "../src/jsx";
import "./vitest-commands.d.ts";

describe("bundleMDX browser tests", () => {
	test("renders counter and can interact with it", async () => {
		const { render, createElement, Runtime } = await getRenderContext();

		const result = await commands.bundle({
			source: `
import { Counter } from "./counter.tsx"

# Counter Test

<Counter />
`.trim(),
			files: { "./counter.tsx": "__COUNTER__" },
			framework,
		});

		expect(result.errors).toEqual([]);

		const Component = createMDXComponent(result, Runtime);
		const screen = await render(createElement(Component));

		await expect.element(screen.getByText("Count: 0")).toBeVisible();
		await screen.getByRole("button", { name: "Increment" }).click();
		await expect.element(screen.getByText("Count: 1")).toBeVisible();
	});

	test("renders greeting component", async () => {
		const { render, createElement, Runtime } = await getRenderContext();

		const result = await commands.bundle({
			source: `
import { Greeting } from "./greeting.tsx"

# Greeting Test

<Greeting name="Vitest" />
`.trim(),
			files: { "./greeting.tsx": "__GREETING__" },
			framework,
		});

		expect(result.errors).toEqual([]);

		const Component = createMDXComponent(result, Runtime);
		const screen = await render(createElement(Component));

		await expect.element(screen.getByText("Hello, Vitest!")).toBeVisible();
	});

	test("renders both components together", async () => {
		const { render, createElement, Runtime } = await getRenderContext();

		const result = await commands.bundle({
			source: `
import { Counter } from "./counter.tsx"
import { Greeting } from "./greeting.tsx"

# Combined Test

<Greeting name="Browser" />
<Counter />
`.trim(),
			files: {
				"./counter.tsx": "__COUNTER__",
				"./greeting.tsx": "__GREETING__",
			},
			framework,
		});

		expect(result.errors).toEqual([]);

		const Component = createMDXComponent(result, Runtime);
		const screen = await render(createElement(Component));

		await expect.element(screen.getByText("Hello, Browser!")).toBeVisible();
		await expect.element(screen.getByText("Count: 0")).toBeVisible();
		await screen.getByRole("button", { name: "Increment" }).click();
		await expect.element(screen.getByText("Count: 1")).toBeVisible();
	});
});

describe("bundleMDX core functionality", () => {
	test("files is optional", async () => {
		const result = await commands.bundle({
			source: "# Hello",
			framework,
		});
		expect(result.errors).toEqual([]);
		expect(result.code).toContain("Hello");
	});

	test("parses frontmatter correctly", async () => {
		const result = await commands.bundle({
			source: `
---
title: Test Title
author: Test Author
---

# Content
`.trim(),
			framework,
		});

		expect(result.errors).toEqual([]);
		expect(result.frontmatter).toEqual({
			title: "Test Title",
			author: "Test Author",
		});
	});

	test("processes nested imports", async () => {
		const result = await commands.bundle({
			source: `
import { MyDemo } from './my-demo'

<MyDemo />
`.trim(),
			files: {
				"./my-demo.tsx": "__MY_DEMO__",
				"./sub/my-sub.tsx": "__MY_SUB__",
			},
			framework,
		});

		expect(result.errors).toEqual([]);
		expect(result.code).toContain("my-demo");
		expect(result.code).toContain("sub-component");
	});

	test("processes JSON imports", async () => {
		const result = await commands.bundle({
			source: `
import config from "./config.json";

# Config Test

App: {config.appName}
`.trim(),
			files: { "./config.json": "__CONFIG_JSON__" },
			framework,
		});

		expect(result.errors).toEqual([]);
		expect(result.code).toContain("File System Test App");
	});

	test("processes TypeScript utility imports", async () => {
		const result = await commands.bundle({
			source: `
import { formatMessage, GREETING_PREFIX } from "./helpers";

# Helper Functions

export const message = formatMessage("Test");
export const prefix = GREETING_PREFIX;
`.trim(),
			files: { "./helpers.ts": "__HELPERS__" },
			framework,
		});

		expect(result.errors).toEqual([]);
		expect(result.code).toContain("formatMessage");
		expect(result.code).toContain("GREETING_PREFIX");
	});

	test("can override node_modules imports with files entry", async () => {
		const result = await commands.bundle({
			source: `
import { MyTestComponent } from './my-test-component.tsx'

<MyTestComponent />
`.trim(),
			files: {
				clsx: `
export default function mockedClsx(...args) {
  return "mocked-clsx-was-definitely-used";
};
`.trim(),
				"./my-test-component.tsx": "__CLSX_TEST__",
			},
			framework,
		});

		expect(result.errors).toEqual([]);
		expect(result.code).toContain("mocked-clsx-was-definitely-used");
	});

	test("processes nested MDX imports", async () => {
		const result = await commands.bundle({
			source: `
import Another from './another.mdx'

# Main MDX

<Another />
`.trim(),
			files: {
				"./another.mdx": `
---
title: Another MDX
---

## Sub MDX Title: {frontmatter.title}

This is nested MDX content!
`.trim(),
			},
			framework,
		});

		expect(result.errors).toEqual([]);
		expect(result.code).toContain("Another MDX");
		expect(result.code).toContain("nested MDX content");
	});
});

describe("comprehensive smoke test", () => {
	test("complex component with multiple features", async () => {
		const { render, createElement, Runtime } = await getRenderContext();

		const result = await commands.bundle({
			source: `
---
title: Example Post
published: 2023-10-27
description: This is some meta-data
---

# This is the title

import { MyDemo } from './my-demo'
import Another from './another.mdx'

Here's a **powered** demo:

<MyDemo />
<Another />
`.trim(),
			files: {
				"./my-demo.tsx": "__SMOKE_DEMO__",
				"./sub/my-sub-dir.tsx": "__MY_SUB_DIR__",
				"./some-js-module.js": `
export function someJsFunction() {
  return "Hello from JS Module!";
}
`.trim(),
				"./data.json": `{ "message": "Hello from JSON!" }`,
				"./another.mdx": `
---
title: Another MDX
---

## Sub MDX Title: {frontmatter.title}

This is another MDX component!
`.trim(),
			},
			framework,
		});

		expect(result.errors).toEqual([]);
		expect(result.warnings).toEqual([]);

		const frontmatter = result.frontmatter as {
			title: string;
			description: string;
			published: Date;
		};

		expect(frontmatter.title).toBe("Example Post");
		expect(frontmatter.description).toBe("This is some meta-data");

		const Component = createMDXComponent(result, Runtime);
		const screen = await render(createElement(Component));

		await expect.element(screen.getByText("This is the title")).toBeVisible();
		await expect.element(screen.getByText("Demo Content")).toBeVisible();
		await expect.element(screen.getByText("Sub dir content!")).toBeVisible();
		await expect.element(screen.getByText(/Hello from JSON!/)).toBeVisible();
		await expect
			.element(screen.getByText(/Hello from JS Module!/))
			.toBeVisible();
		await expect
			.element(screen.getByText("This is another MDX component!"))
			.toBeVisible();
	});
});
