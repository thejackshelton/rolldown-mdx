interface GreetingProps {
	name?: string;
}

export const Greeting = ({ name = "World" }: GreetingProps) => {
	return <div className="greeting-component">Hello, {name}!</div>;
};

export default Greeting;

