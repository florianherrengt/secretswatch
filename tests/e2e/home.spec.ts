import { type Page } from "@playwright/test";
import { expect, test } from "./fixtures/authed";

const domain = process.env.DOMAIN ?? "127.0.0.1:3000";
const waitForScanCompletion = async (page: Page) => {
	for (let attempt = 0; attempt < 20; attempt += 1) {
		const statusText = await page.locator("p", { hasText: "Status:" }).textContent();

		if (statusText?.includes("success")) {
			return;
		}

		if (statusText?.includes("failed")) {
			throw new Error("Scan entered failed state during e2e test");
		}

		await page.waitForTimeout(250);
		await page.reload();
	}

	throw new Error("Timed out waiting for scan completion");
};

test("home page loads", async ({ page }) => {
	await page.goto("/");

	await expect(page).toHaveTitle("Home | Secret Detector");
	await expect(page.getByRole("heading", { name: "Secret Detector" })).toBeVisible();
	await expect(page.getByRole("button", { name: "Run scan" })).toBeVisible();
});

test("scan form submits and renders no-findings result", async ({ authedPage }) => {
	const page = authedPage;
	await page.goto("/");

	await page.getByLabel("Domain target").fill(`${domain}/sandbox/website/examples/no-leak/`);
	await page.getByRole("button", { name: "Run scan" }).click();

	await expect(page).toHaveURL(/\/scan\/[0-9a-f-]{36}$/);
	await expect(page.getByRole("heading", { name: "Scan Result" })).toBeVisible();
	await expect(page.getByText("Status:")).toBeVisible();
	await waitForScanCompletion(page);
	await expect(page.getByText("No findings")).toBeVisible();
});

test("scan form submits and renders redacted finding", async ({ authedPage }) => {
	const page = authedPage;
	await page.goto("/");

	await page.getByLabel("Domain target").fill(`${domain}/sandbox/website/examples/pem-key/`);
	await page.getByRole("button", { name: "Run scan" }).click();

	await expect(page).toHaveURL(/\/scan\/[0-9a-f-]{36}$/);
	await expect(page.getByRole("heading", { name: "Scan Result" })).toBeVisible();
	await waitForScanCompletion(page);
	await expect(page.getByText("File:")).toBeVisible();
	await expect(page.getByText("Snippet:")).toBeVisible();
	await expect(page.getByText("[REDACTED]")).toBeVisible();
});

test("repeat leak scan still shows findings", async ({ authedPage }) => {
	const page = authedPage;
	const target = `${domain}/sandbox/website/examples/pem-key/`;

	await page.goto("/");

	await page.getByLabel("Domain target").fill(target);
	await page.getByRole("button", { name: "Run scan" }).click();

	await expect(page).toHaveURL(/\/scan\/[0-9a-f-]{36}$/);
	await waitForScanCompletion(page);
	await expect(page.getByText("File:")).toBeVisible();

	await page.goto("/");

	await page.getByLabel("Domain target").fill(target);
	await page.getByRole("button", { name: "Run scan" }).click();

	await expect(page).toHaveURL(/\/scan\/[0-9a-f-]{36}$/);
	await waitForScanCompletion(page);
	await expect(page.getByText("File:")).toBeVisible();
	await expect(page.getByText("[REDACTED]")).toBeVisible();
});
