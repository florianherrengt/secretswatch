import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { Hono } from "hono";
import type { Context } from "hono";

const sandboxDemoRoutes = new Hono();

const moduleDir = dirname(fileURLToPath(import.meta.url));
const siteDir = join(moduleDir, "site");
const indexHtml = readFileSync(join(siteDir, "index.html"), "utf8");
const mainJs = readFileSync(join(siteDir, "assets", "main.js"), "utf8");
const mainJsMap = readFileSync(join(siteDir, "assets", "main.js.map"), "utf8");

sandboxDemoRoutes.get(
	"/",
	z
		.function()
		.args(z.custom<Context>())
		.returns(z.custom<Response | Promise<Response>>())
		.implement((c) => {
			return c.html(indexHtml);
		})
);

sandboxDemoRoutes.get(
	"/assets/main.js",
	z
		.function()
		.args(z.custom<Context>())
		.returns(z.custom<Response | Promise<Response>>())
		.implement((c) => {
			return c.body(mainJs, 200, {
				"content-type": "application/javascript; charset=utf-8",
				"cache-control": "no-store"
			});
		})
);

sandboxDemoRoutes.get(
	"/assets/main.js.map",
	z
		.function()
		.args(z.custom<Context>())
		.returns(z.custom<Response | Promise<Response>>())
		.implement((c) => {
			return c.body(mainJsMap, 200, {
				"content-type": "application/json; charset=utf-8",
				"cache-control": "no-store"
			});
		})
);

export default sandboxDemoRoutes;
