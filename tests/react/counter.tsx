import { useState } from "react";

export const Counter = () => {
	const [count, setCount] = useState(0);
	return (
		<div className="counter-component">
			<span className="count-value">Count: {count}</span>
			<button type="button" onClick={() => setCount((c) => c + 1)}>
				Increment
			</button>
		</div>
	);
};

export default Counter;

