import { type Page } from "@playwright/test";
import { expect, test } from "./fixtures/authed";
import { builtinChecks } from "../../src/pipeline/checks.js";

const waitForScanCompletion = async (page: Page) => {
	for (let attempt = 0; attempt < 20; attempt += 1) {
		const issueDetected = await page.getByText("Issue Detected", { exact: true }).count();
		const noIssuesFound = await page.getByText("No Issues Found", { exact: true }).count();

		if (issueDetected > 0 || noIssuesFound > 0) {
			return;
		}

		await page.waitForTimeout(250);
		await page.reload();
	}

	throw new Error("Timed out waiting for scan completion");
};

const startDemoScan = async (page: Page) => {
	for (let attempt = 0; attempt < 6; attempt += 1) {
		const demoCard = page.locator("div", {
			has: page.getByText("Security issues demo website", { exact: true })
		});

		await demoCard.getByRole("button", { name: "Scan with tool" }).click();
		await page.waitForURL(/\/scan(\/[0-9a-f-]{36})?$/, { timeout: 5_000 });

		if (/\/scan\/[0-9a-f-]{36}$/.test(page.url())) {
			await expect(page).toHaveTitle("Scan Result | Secret Detector");
			await waitForScanCompletion(page);
			return;
		}

		const limited = await page.getByRole("heading", { name: "Too Many Requests" }).count();

		if (limited === 0) {
			throw new Error(`Expected scan result redirect for demo website but stayed on ${page.url()}`);
		}

		await page.waitForTimeout(2_000 * (attempt + 1));
		await page.goto("/");
	}

	throw new Error("Rate limit prevented scanning demo website");
};

test("home page loads", async ({ page }) => {
	await page.goto("/");

	await expect(page).toHaveTitle("Home | Secret Detector");
	await expect(page.getByRole("heading", { name: "Secret Detector" })).toBeVisible();
	await expect(page.getByRole("button", { name: "Run scan" })).toBeVisible();
	await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();
	await expect(page.getByRole("link", { name: "Sign up" })).toBeVisible();
	await expect(page.getByRole("link", { name: "Go to app" })).toHaveCount(0);
});

test("home page shows go to app when user is logged in", async ({ authedPage }) => {
	const page = authedPage;

	await page.goto("/");

	await expect(page.getByRole("link", { name: "Go to app" })).toBeVisible();
	await expect(page.getByRole("link", { name: "Sign in" })).toHaveCount(0);
	await expect(page.getByRole("link", { name: "Sign up" })).toHaveCount(0);
});

test("sign in button goes to sign in page", async ({ page }) => {
	await page.goto("/");

	await page.getByRole("link", { name: "Sign in" }).click();

	await expect(page).toHaveURL(/\/auth\/sign-in$/);
	await expect(page.getByRole("heading", { name: "Sign In" })).toBeVisible();
});

test("sign up button goes to sign up page", async ({ page }) => {
	await page.goto("/");

	await page.getByRole("link", { name: "Sign up" }).click();

	await expect(page).toHaveURL(/\/auth\/sign-up$/);
	await expect(page.getByRole("heading", { name: "Sign Up" })).toBeVisible();
});

test("sign in page submits to request-link", async ({ page }) => {
	const email = `signin-${Date.now()}@example.com`;

	await page.goto("/auth/sign-in");
	await page.getByLabel("Email").fill(email);
	await page.getByRole("button", { name: "Send magic link" }).click();

	await expect(page.getByText("Check your email for a sign-in link.")).toBeVisible();
});

test("sign up page submits to request-link", async ({ page }) => {
	const email = `signup-${Date.now()}@example.com`;

	await page.goto("/auth/sign-up");
	await page.getByLabel("Email").fill(email);
	await page.getByRole("button", { name: "Send magic link" }).click();

	await expect(page.getByText("Check your email for a sign-in link.")).toBeVisible();
});

test.describe("demo website scan", () => {
	test.describe.configure({ mode: "serial" });

	test("scan shows findings for every builtin check", async ({ authedPage }) => {
		const page = authedPage;

		await page.goto("/");
		await startDemoScan(page);

		await expect(page.getByText("Issue Detected", { exact: true })).toBeVisible();

		for (const check of builtinChecks) {
			await expect(page.getByText(check.name, { exact: true })).toBeVisible();
		}

		await expect(page.getByText("[REDACTED]").first()).toBeVisible();
	});
});
