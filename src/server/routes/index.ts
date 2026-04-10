import { z } from "zod";
import { Hono } from "hono";
import type { Context } from "hono";
import { render } from "../../lib/response.js";
import { HomePage } from "../../views/pages/home.js";

const app = new Hono();

app.get(
	"/healthz",
	z
		.function()
		.args(z.custom<Context>())
		.returns(z.instanceof(Response))
		.implement((c) => {
			return c.json({ status: "ok" });
		})
);

app.get(
	"/",
	z
		.function()
		.args(z.custom<Context>())
		.returns(z.custom<Response | Promise<Response>>())
		.implement((_c) => {
			return _c.html(render(HomePage));
		})
);

export default app;
