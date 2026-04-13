import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockDnsLookup = vi.fn();

vi.mock("node:dns/promises", () => ({
	get lookup() {
		return mockDnsLookup;
	}
}));

import { scanDomain } from "./scanDomain.js";

const makeResponse = (url: string, status: number, body: string, contentType: string): Response => {
	const headers = new Headers({ "content-type": contentType });
	return {
		ok: status >= 200 && status < 300,
		status,
		url,
		headers,
		body: undefined,
		text: async () => body
	} as unknown as Response;
};

describe("scanDomain discovery contract", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		mockDnsLookup.mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("returns hostname-only discoveredSubdomains with deterministic sorted order and stats", async () => {
		const mockFetch = vi.fn(async (input: string | URL) => {
			const url = String(input);

			if (url === "https://example.com/path") {
				return makeResponse(
					url,
					200,
					`<html><body>
						<a href="https://z.example.com/a">Z</a>
						<a href="https://a.example.com/a">A</a>
						<a href="https://m.example.com/a">M</a>
						<script src="/main.js"></script>
					</body></html>`,
					"text/html"
				);
			}

			if (url === "https://example.com/main.js") {
				return makeResponse(url, 200, "console.log('ok');", "application/javascript");
			}

			return makeResponse(url, 404, "", "text/plain");
		});

		vi.stubGlobal("fetch", mockFetch);

		const result = await scanDomain({ domain: "example.com/path" });

		expect(result.status).toBe("success");
		expect(result.discoveredSubdomains).toEqual([
			"a.example.com",
			"m.example.com",
			"z.example.com"
		]);
		for (const host of result.discoveredSubdomains) {
			expect(host).not.toContain("://");
			expect(host).not.toContain("/");
		}
		expect(result.discoveryStats.fromLinks).toBe(3);
		expect(result.discoveryStats.fromSitemap).toBe(0);
		expect(result.discoveryStats.totalAccepted).toBe(3);
		expect(result.discoveryStats.totalConsidered).toBe(4);
		expect(result.discoveryStats.truncated).toBe(false);
	});

	it("truncates discoveredSubdomains deterministically at cap", async () => {
		const anchors = Array.from({ length: 25 }, (_, index) => {
			const id = String(index).padStart(2, "0");
			return `<a href="https://sub${id}.example.com/page">sub${id}</a>`;
		}).join("");

		const mockFetch = vi.fn(async (input: string | URL) => {
			const url = String(input);
			if (url === "https://example.com/") {
				return makeResponse(
					url,
					200,
					`<html><body>${anchors}<script src="/main.js"></script></body></html>`,
					"text/html"
				);
			}
			if (url === "https://example.com/main.js") {
				return makeResponse(url, 200, "console.log('ok');", "application/javascript");
			}
			return makeResponse(url, 404, "", "text/plain");
		});

		vi.stubGlobal("fetch", mockFetch);

		const result = await scanDomain({ domain: "example.com" });

		expect(result.status).toBe("success");
		expect(result.discoveredSubdomains).toHaveLength(20);
		expect(result.discoveredSubdomains[0]).toBe("sub00.example.com");
		expect(result.discoveredSubdomains[19]).toBe("sub19.example.com");
		expect(result.discoveryStats.truncated).toBe(true);
	});

	it("rejects main-page redirects that leave the base host", async () => {
		const mockFetch = vi.fn(async (input: string | URL) => {
			const url = String(input);
			if (url === "https://example.com/") {
				return makeResponse(
					"https://evil.example.net/",
					200,
					"<html><body><script src='/main.js'></script></body></html>",
					"text/html"
				);
			}
			return makeResponse(url, 404, "", "text/plain");
		});

		vi.stubGlobal("fetch", mockFetch);

		const result = await scanDomain({ domain: "example.com" });

		expect(result.status).toBe("failed");
		expect(result.discoveredSubdomains).toEqual([]);
		expect(result.discoveryStats.totalAccepted).toBe(0);
	});

	it("accepts main-page redirects to subdomains of the base host", async () => {
		const mockFetch = vi.fn(async (input: string | URL) => {
			const url = String(input);
			if (url === "https://example.com/") {
				return makeResponse(
					"https://www.example.com/",
					200,
					`<html><body>
						<a href="https://app.example.com/login">App</a>
						<script src="https://www.example.com/main.js"></script>
					</body></html>`,
					"text/html"
				);
			}

			if (url === "https://www.example.com/main.js") {
				return makeResponse(url, 200, "console.log('ok');", "application/javascript");
			}

			return makeResponse(url, 404, "", "text/plain");
		});

		vi.stubGlobal("fetch", mockFetch);

		const result = await scanDomain({ domain: "example.com" });

		expect(result.status).toBe("success");
		expect(result.discoveredSubdomains).toContain("app.example.com");
	});

	it("returns success when homepage fetch succeeds but has no script tags", async () => {
		const mockFetch = vi.fn(async (input: string | URL) => {
			const url = String(input);
			if (url === "https://example.com/") {
				return makeResponse(url, 200, "<html><body><h1>No Scripts</h1></body></html>", "text/html");
			}
			return makeResponse(url, 404, "", "text/plain");
		});

		vi.stubGlobal("fetch", mockFetch);

		const result = await scanDomain({ domain: "example.com" });

		expect(result.status).toBe("success");
		expect(result.findings).toEqual([]);
		expect(result.discoveryStats.truncated).toBe(false);
	});

	it("returns success when homepage fetch succeeds with non-html content", async () => {
		const mockFetch = vi.fn(async (input: string | URL) => {
			const url = String(input);
			if (url === "https://example.com/") {
				return makeResponse(url, 200, "plain body", "text/plain");
			}
			return makeResponse(url, 404, "", "text/plain");
		});

		vi.stubGlobal("fetch", mockFetch);

		const result = await scanDomain({ domain: "example.com" });

		expect(result.status).toBe("success");
		expect(result.findings).toEqual([]);
		expect(result.discoveryStats.truncated).toBe(false);
	});

	it("rejects discovered target redirects that leave the selected host", async () => {
		const mockFetch = vi.fn(async (input: string | URL) => {
			const url = String(input);

			if (url === "https://example.com/") {
				return makeResponse(
					url,
					200,
					`<html><body>
						<a href="https://a.example.com/page">A</a>
						<script src="/main.js"></script>
					</body></html>`,
					"text/html"
				);
			}

			if (url === "https://example.com/main.js") {
				return makeResponse(url, 200, "console.log('ok');", "application/javascript");
			}

			if (url === "https://a.example.com/") {
				return makeResponse(
					"https://evil.example.net/",
					200,
					"<html><body><script src='/sub.js'></script></body></html>",
					"text/html"
				);
			}

			return makeResponse(url, 404, "", "text/plain");
		});

		vi.stubGlobal("fetch", mockFetch);

		const result = await scanDomain({ domain: "example.com" });

		expect(result.status).toBe("success");
		expect(result.discoveredSubdomains).toEqual(["a.example.com"]);
		expect(result.discoveryStats.fromLinks).toBe(1);
		expect(result.discoveryStats.totalAccepted).toBe(1);
	});
});
