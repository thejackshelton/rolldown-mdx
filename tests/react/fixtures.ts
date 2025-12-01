export const myDemoCode = `
import { MySubComponent } from "./sub/my-sub";

export const MyDemo = () => {
	return (
		<div className="my-demo">
			<MySubComponent />
		</div>
	);
};
`.trim();

export const mySubCode = `
export const MySubComponent = () => {
	return <span className="sub-component">Sub Content</span>;
};
`.trim();

export const smokeDemoCode = `
import clsx from "clsx";
import { MySubDirComponent } from "./sub/my-sub-dir";
import { someJsFunction } from "./some-js-module";
import jsonData from "./data.json";

export const MyDemo = () => {
	const showSpecialClass = true;
	return (
		<div className={clsx("my-demo-component", showSpecialClass && "special-class")}>
			Demo Content
			<MySubDirComponent>Sub dir content!</MySubDirComponent>
			<p>JSON Data: {jsonData.message}</p>
			<div>JS Module Says: {someJsFunction()}</div>
		</div>
	);
};
`.trim();

export const mySubDirCode = `
export const MySubDirComponent = ({ children }) => {
	return (
		<div className="sub-dir">
			{children}
		</div>
	);
};
`.trim();

export const clsxTestComponentCode = `
import myMockedClsx from "clsx";

export const MyTestComponent = () => {
	const classes = myMockedClsx("foo", { bar: true });
	return <div className={classes}>Mocked: {classes}</div>;
};
`.trim();

export const framework = "react" as const;
