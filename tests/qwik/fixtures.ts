export const myDemoCode = `
import { component$ } from "@builder.io/qwik";
import { MySubComponent } from "./sub/my-sub";

export const MyDemo = component$(() => {
	return (
		<div class="my-demo">
			<MySubComponent />
		</div>
	);
});
`.trim();

export const mySubCode = `
import { component$ } from "@builder.io/qwik";

export const MySubComponent = component$(() => {
	return <span class="sub-component">Sub Content</span>;
});
`.trim();

export const smokeDemoCode = `
import clsx from "clsx";
import { component$ } from "@builder.io/qwik";
import { MySubDirComponent } from "./sub/my-sub-dir";
import { someJsFunction } from "./some-js-module";
import jsonData from "./data.json";

export const MyDemo = component$(() => {
	const showSpecialClass = true;
	return (
		<div class={clsx("my-demo-component", showSpecialClass && "special-class")}>
			Demo Content
			<MySubDirComponent>Sub dir content!</MySubDirComponent>
			<p>JSON Data: {jsonData.message}</p>
			<div>JS Module Says: {someJsFunction()}</div>
		</div>
	);
});
`.trim();

export const mySubDirCode = `
import { component$, Slot } from "@builder.io/qwik";

export const MySubDirComponent = component$(() => {
	return (
		<div class="sub-dir">
			<Slot />
		</div>
	);
});
`.trim();

export const clsxTestComponentCode = `
import { component$ } from "@builder.io/qwik";
import myMockedClsx from "clsx";

export const MyTestComponent = component$(() => {
	const classes = myMockedClsx("foo", { bar: true });
	return <div class={classes}>Mocked: {classes}</div>;
});
`.trim();

export const framework = "qwik" as const;
