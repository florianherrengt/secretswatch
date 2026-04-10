import { expect, test } from "./fixtures/authed";

test.describe("Admin Queue Auth", () => {
	test("returns 401 when unauthenticated", async ({ request }) => {
		const response = await request.get("/admin/queues", { maxRedirects: 0 });

		expect(response.status()).toBe(401);
		const body = await response.json();
		expect(body).toHaveProperty("error");
	});

	test("returns queue page when authenticated", async ({ request, authHeaders }) => {
		const response = await request.get("/admin/queues", {
			headers: authHeaders,
			maxRedirects: 0
		});

		expect(response.status()).toBe(200);
		expect(response.headers()["content-type"]).toContain("text/html");
	});
});
