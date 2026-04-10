import { z } from "zod";

type Renderable =
	| string
	| Promise<string>
	| { toString: () => string | Promise<string> }
	| null;

type NoPropsComponent = (props: Record<string, never>) => Renderable;

export const render = z
	.function()
	.args(z.custom<NoPropsComponent>())
	.returns(z.union([z.string(), z.promise(z.string())]))
	.implement((Component) => {
		const element = Component({});

		if (element === null) {
			return "";
		}

		if (typeof element === "string") {
			return element;
		}

		if (element instanceof Promise) {
			return element;
		}

		return element.toString();
	});
