import { useState } from "react";

export const Counter = () => {
	const [count, setCount] = useState(0);
	return (
		<div class="counter-component">
			<span class="count-value">Count: {count}</span>
			<button type="button" onClick={() => setCount((c) => c + 1)}>
				Increment
			</button>
		</div>
	);
};

export default Counter;
