import { component$ } from "@builder.io/qwik";

interface GreetingProps {
	name?: string;
}

export const Greeting = component$<GreetingProps>(({ name = "World" }) => {
	return <div class="greeting-component">Hello, {name}!</div>;
});

export default Greeting;

