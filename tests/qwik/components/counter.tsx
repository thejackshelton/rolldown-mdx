import { component$, useSignal } from "@builder.io/qwik";

export const Counter = component$(() => {
	const count = useSignal(0);
	return (
		<div class="counter-component">
			<span class="count-value">Count: {count.value}</span>
			<button type="button" onClick$={() => count.value++}>
				Increment
			</button>
		</div>
	);
});

export default Counter;

