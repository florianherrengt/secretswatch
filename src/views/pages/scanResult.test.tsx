import { describe, expect, it } from "vitest";
import { render } from "../../lib/response.js";
import { ScanResultPage, type ScanResultPageProps } from "./scanResult.js";

const baseProps: ScanResultPageProps = {
	domain: "example.com",
	status: "success",
	startedAtIso: "2026-01-01T00:00:00.000Z",
	finishedAtIso: "2026-01-01T00:00:05.000Z",
	checks: [
		{
			id: "check-1",
			name: "PEM Key Check",
			description: "Detects leaked PEM keys",
			status: "passed",
			findings: []
		},
		{
			id: "check-2",
			name: "JWT Token Check",
			description: "Detects leaked JWTs",
			status: "failed",
			findings: [{ file: "main.js", snippet: "token=[REDACTED]" }]
		}
	]
};

const renderPage = (overrides: Partial<ScanResultPageProps> = {}): string => {
	const props = { ...baseProps, ...overrides };
	return render(ScanResultPage, props) as string;
};

describe("ScanResultPage - Checks Overview visibility", () => {
	it("does not render Checks Overview when scan is pending", () => {
		const html = renderPage({ status: "pending", finishedAtIso: null });

		expect(html).not.toContain("Checks Overview");
		expect(html).toContain("Scan Summary");
	});

	it("renders Checks Overview when scan succeeded", () => {
		const html = renderPage({ status: "success" });

		expect(html).toContain("Checks Overview");
		expect(html).toContain("PEM Key Check");
		expect(html).toContain("JWT Token Check");
	});

	it("renders Checks Overview when scan failed", () => {
		const html = renderPage({ status: "failed", finishedAtIso: "2026-01-01T00:00:02.000Z" });

		expect(html).toContain("Checks Overview");
	});

	it("does not render Detailed Findings when scan is pending", () => {
		const html = renderPage({ status: "pending", finishedAtIso: null });

		expect(html).not.toContain("Detailed Findings");
	});

	it("renders Detailed Findings when scan succeeded", () => {
		const html = renderPage({ status: "success" });

		expect(html).toContain("Detailed Findings");
	});

	it("only shows checks with findings in Detailed Findings", () => {
		const html = renderPage({ status: "success" });

		const summarySection = html.indexOf("Detailed Findings");
		const beforeSummary = html.slice(0, summarySection);
		const afterSummary = html.slice(summarySection);

		expect(beforeSummary).toContain("JWT Token Check");
		expect(afterSummary).toContain("JWT Token Check");
		expect(afterSummary).not.toContain("PEM Key Check");
	});

	it("renders Scan Summary for all statuses", () => {
		const statuses: Array<ScanResultPageProps["status"]> = ["pending", "success", "failed"];

		for (const status of statuses) {
			const html = renderPage({ status, finishedAtIso: status === "pending" ? null : "2026-01-01T00:00:05.000Z" });
			expect(html).toContain("Scan Summary");
		}
	});

	it("shows running badge when pending", () => {
		const html = renderPage({ status: "pending", finishedAtIso: null });

		expect(html).toContain("running");
		expect(html).toContain("In progress");
	});

	it("shows failed badge when failed", () => {
		const html = renderPage({ status: "failed", finishedAtIso: "2026-01-01T00:00:02.000Z" });

		expect(html).toContain("failed");
	});
});
