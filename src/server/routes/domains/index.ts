import { z } from "zod";
import { desc, eq, inArray, sql } from "drizzle-orm";
import { Hono } from "hono";
import type { Context } from "hono";
import { render } from "../../../lib/response.js";
import { domainListPagePropsSchema, DomainListPage } from "../../../views/pages/domainList.js";
import { confirmPagePropsSchema, ConfirmPage } from "../../../views/pages/confirm.js";
import { db } from "../../db/client.js";
import { domains, findings, scans, userDomains } from "../../db/schema.js";
import { normalizeSubmittedDomain } from "../../scan/scanJob.js";
import { requireAuth } from "../../auth/middleware.js";

const domainRoutes = new Hono();

domainRoutes.use("*", requireAuth);

const addDomainFormSchema = z.object({
	domain: z.string().trim().min(1).max(2048)
});

const deleteDomainParamsSchema = z.object({
	domainId: z.string().uuid()
});

const confirmQuerySchema = z.object({
	title: z.string().trim().min(1).max(100).default("Confirm Action"),
	text: z.string().trim().min(1).max(300),
	next: z
		.string()
		.trim()
		.min(1)
		.max(2048)
		.regex(/^\/(?!\/).+$/, "Invalid next endpoint"),
	back: z
		.string()
		.trim()
		.min(1)
		.max(2048)
		.regex(/^\/(?!\/).+$/, "Invalid cancel endpoint")
		.default("/domains"),
	confirmLabel: z.string().trim().min(1).max(40).default("Confirm"),
	cancelLabel: z.string().trim().min(1).max(40).default("Cancel")
});

domainRoutes.get(
	"/",
	z
		.function()
		.args(z.custom<Context>())
		.returns(z.custom<Response | Promise<Response>>())
		.implement(async (c) => {
			const rows = await db.select().from(userDomains);
			const uniqueHostnames = [...new Set(rows.map((row) => row.domain))];
			const domainRows = uniqueHostnames.length > 0
				? await db
					.select({ id: domains.id, hostname: domains.hostname })
					.from(domains)
					.where(inArray(domains.hostname, uniqueHostnames))
				: [];
			const domainIdByHostname = new Map(domainRows.map((row) => [row.hostname, row.id]));
			const domainIds = [...new Set(domainRows.map((row) => row.id))];
			const scanRows = domainIds.length > 0
				? await db
					.select({
						id: scans.id,
						domainId: scans.domainId,
						status: scans.status,
						startedAt: scans.startedAt
					})
					.from(scans)
					.where(inArray(scans.domainId, domainIds))
					.orderBy(desc(scans.startedAt))
				: [];
			const latestSuccessfulScanByDomainId = new Map<string, string>();

			for (const scanRow of scanRows) {
				if (scanRow.status !== "success") {
					continue;
				}

				if (!latestSuccessfulScanByDomainId.has(scanRow.domainId)) {
					latestSuccessfulScanByDomainId.set(scanRow.domainId, scanRow.id);
				}
			}

			const latestSuccessfulScanIds = [...new Set(latestSuccessfulScanByDomainId.values())];
			const findingCountRows = latestSuccessfulScanIds.length > 0
				? await db
					.select({
						scanId: findings.scanId,
						count: sql<number>`count(*)`
					})
					.from(findings)
					.where(inArray(findings.scanId, latestSuccessfulScanIds))
					.groupBy(findings.scanId)
				: [];
			const findingCountByScanId = new Map(findingCountRows.map((row) => [row.scanId, Number(row.count)]));
			const viewProps = domainListPagePropsSchema.parse({
				domains: rows.map((row) => ({
					id: row.id,
					domain: row.domain,
					lastCheckResult: (() => {
						const domainId = domainIdByHostname.get(row.domain);

						if (!domainId) {
							return "none";
						}

						const scanId = latestSuccessfulScanByDomainId.get(domainId);

						if (!scanId) {
							return "none";
						}

						return (findingCountByScanId.get(scanId) ?? 0) > 0 ? "issues" : "pass";
					})(),
					deleteConfirmHref: `/domains/confirm?title=${encodeURIComponent("Delete Domain")}&text=${encodeURIComponent(`Delete ${row.domain}? This action cannot be undone.`)}&next=${encodeURIComponent(`/domains/${row.id}/delete`)}&back=${encodeURIComponent("/domains")}&confirmLabel=${encodeURIComponent("Delete")}&cancelLabel=${encodeURIComponent("Keep Domain")}`
				}))
			});

			return c.html(render(DomainListPage, viewProps));
		})
);

domainRoutes.get(
	"/confirm",
	z
		.function()
		.args(z.custom<Context>())
		.returns(z.custom<Response | Promise<Response>>())
		.implement(async (c) => {
			const parsedQuery = confirmQuerySchema.safeParse(c.req.query());

			if (!parsedQuery.success) {
				return c.html("<h1>Bad Request</h1><p>Invalid confirmation request.</p>", 400);
			}

			const viewProps = confirmPagePropsSchema.parse({
				title: parsedQuery.data.title,
				message: parsedQuery.data.text,
				confirmAction: parsedQuery.data.next,
				cancelHref: parsedQuery.data.back,
				confirmLabel: parsedQuery.data.confirmLabel,
				cancelLabel: parsedQuery.data.cancelLabel
			});

			return c.html(render(ConfirmPage, viewProps));
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

domainRoutes.post(
	"/:domainId/delete",
	z
		.function()
		.args(z.custom<Context>())
		.returns(z.custom<Response | Promise<Response>>())
		.implement(async (c) => {
			const parsedParams = deleteDomainParamsSchema.safeParse(c.req.param());

			if (!parsedParams.success) {
				return c.html("<h1>Bad Request</h1><p>Invalid domain id.</p>", 400);
			}

			await db.delete(userDomains).where(eq(userDomains.id, parsedParams.data.domainId));

			return c.redirect("/domains", 302);
		})
);

export default domainRoutes;
