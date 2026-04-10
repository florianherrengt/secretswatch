import { z } from "zod";
import { Hono } from "hono";
import type { Context } from "hono";
import { render } from "../../../lib/response.js";
import { domainListPagePropsSchema, DomainListPage } from "../../../views/pages/domainList.js";
import { db } from "../../db/client.js";
import { userDomains } from "../../db/schema.js";
import { normalizeSubmittedDomain } from "../../scan/scanJob.js";
import { requireAuth } from "../../auth/middleware.js";

const domainRoutes = new Hono();

domainRoutes.use("*", requireAuth);

const addDomainFormSchema = z.object({
	domain: z.string().trim().min(1).max(2048)
});

domainRoutes.get(
	"/",
	z
		.function()
		.args(z.custom<Context>())
		.returns(z.custom<Response | Promise<Response>>())
		.implement(async (c) => {
			const rows = await db.select().from(userDomains);
			const viewProps = domainListPagePropsSchema.parse({
				domains: rows.map((row) => ({
					id: row.id,
					domain: row.domain
				}))
			});

			return c.html(render(DomainListPage, viewProps));
		})
);

domainRoutes.post(
	"/",
	z
		.function()
		.args(z.custom<Context>())
		.returns(z.custom<Response | Promise<Response>>())
		.implement(async (c) => {
			const body = await c.req.parseBody();
			const parsedForm = addDomainFormSchema.safeParse({
				domain: typeof body.domain === "string" ? body.domain : ""
			});

			if (!parsedForm.success) {
				return c.html("<h1>Bad Request</h1><p>Invalid domain input.</p>", 400);
			}

			const normalizedDomain = normalizeSubmittedDomain(parsedForm.data.domain);

			await db.insert(userDomains).values({
				domain: normalizedDomain,
				createdAt: new Date()
			});

			return c.redirect("/domains", 302);
		})
);

export default domainRoutes;
