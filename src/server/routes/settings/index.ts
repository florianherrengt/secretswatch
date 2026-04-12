import { z } from "zod";
import { Hono } from "hono";
import type { Context } from "hono";
import { render } from "../../../lib/response.js";
import { settingsPagePropsSchema, SettingsPage } from "../../../views/pages/settings.js";
import { requireAuth, type AuthContext } from "../../auth/middleware.js";

const settingsRoutes = new Hono();

settingsRoutes.use("*", requireAuth);

settingsRoutes.get(
	"/",
	z
		.function()
		.args(z.custom<Context>())
		.returns(z.custom<Response | Promise<Response>>())
		.implement(async (c) => {
			const user = (c as AuthContext).user;

			if (!user) {
				return c.json({ error: "Authentication required" }, 401);
			}

			const viewProps = settingsPagePropsSchema.parse({
				email: user.email
			});

			return c.html(render(SettingsPage, viewProps));
		})
);

export default settingsRoutes;
