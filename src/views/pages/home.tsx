import { z } from "zod";
import type { FC } from "hono/jsx";
import { Layout } from "../layout.js";

export const HomePage: FC<Record<string, never>> = z
	.function()
	.args()
	.returns(z.custom<ReturnType<FC<Record<string, never>>>>())
	.implement(() => {
		return (
			<Layout title="Home">
				<h1>Secret Detector</h1>
				<p>Server-side domain scanning and secret detection platform.</p>
			</Layout>
		);
	});
