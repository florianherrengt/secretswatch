/* eslint-disable custom/no-raw-functions */
import { test as base, expect, type Page } from "@playwright/test";
import { createAuthenticatedSession, type AuthSession } from "../support/auth";

type AuthFixtures = {
	authSession: AuthSession;
	authHeaders: Record<string, string>;
	authedPage: Page;
};

const getCookieTarget = (value: unknown) => {
	const fallbackDomain = process.env.DOMAIN ?? "127.0.0.1:3000";
	const fallbackBaseUrl = fallbackDomain.includes("://")
		? fallbackDomain
		: `http://${fallbackDomain}`;
	const baseUrl = typeof value === "string" && value.length > 0 ? value : fallbackBaseUrl;
	const parsedBaseUrl = new URL(baseUrl);

	return {
		domain: parsedBaseUrl.hostname,
		secure: parsedBaseUrl.protocol === "https:"
	};
};

export const test = base.extend<AuthFixtures>({
	authSession: async ({ request }, use) => {
		const session = await createAuthenticatedSession(request);
		await use(session);
	},
	authHeaders: async ({ authSession }, use) => {
		await use({ Cookie: authSession.cookieHeader });
	},
	authedPage: async ({ page, authSession }, use, testInfo) => {
		const cookieTarget = getCookieTarget(testInfo.project.use.baseURL);

		await page.context().addCookies([
			{
				name: "session_id",
				value: authSession.sessionId,
				domain: cookieTarget.domain,
				path: "/",
				httpOnly: true,
				sameSite: "Lax",
				secure: cookieTarget.secure
			}
		]);

		await use(page);
	}
});

export { expect };
