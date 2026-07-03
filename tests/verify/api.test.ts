import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
// Importing only the verify API sub-app avoids pulling in the db/redis-backed
// middleware from the root app, so this stays runnable in the lightweight
// vitest.verify config.
import verifyRoutes from '../../src/server/routes/verify/index.js';

const app = new Hono();
app.route('/api', verifyRoutes);

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

const postJson = (body: unknown) =>
	app.fetch(
		new Request('http://localhost/api/verify-credentials', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(body),
		}),
	);

describe('POST /api/verify-credentials', () => {
	beforeEach(() => {
		mockFetch.mockReset();
	});

	it('returns { valid: true } when the provider confirms the credential', async () => {
		mockFetch.mockResolvedValueOnce(new Response(null, { status: 200 }));
		const res = await postJson({ provider: 'openai', credentials: { apiKey: 'sk-valid' } });
		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ valid: true });
	});

	it('returns { valid: false } when the provider rejects the credential', async () => {
		mockFetch.mockResolvedValueOnce(new Response(null, { status: 401 }));
		const res = await postJson({ provider: 'github', credentials: { token: 'ghp_bad' } });
		// The public JSON API must only expose `valid`; the internal `reason`
		// diagnostics are for the UI and are not part of the response shape.
		expect(await res.json()).toEqual({ valid: false });
	});

	it('returns { valid: false } on network failure and does not leak reason', async () => {
		mockFetch.mockRejectedValueOnce(new Error('network failure'));
		const res = await postJson({ provider: 'github', credentials: { token: 'ghp_x' } });
		expect(await res.json()).toEqual({ valid: false });
	});

	it('accepts the multi-field AWS credential shape { accessKeyId, secretAccessKey }', async () => {
		// AWS is intentionally excluded from the single-field UI form, but the
		// JSON API still supports it. A well-formed key reports valid.
		const res = await postJson({
			provider: 'aws',
			credentials: {
				accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
				secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
			},
		});
		expect(await res.json()).toEqual({ valid: true });
		expect(mockFetch).not.toHaveBeenCalled();
	});

	it('returns 400 for an unknown provider', async () => {
		const res = await postJson({ provider: 'dropbox', credentials: { apiKey: 'x' } });
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body).toHaveProperty('error');
	});

	it('returns 400 for an invalid JSON body', async () => {
		const res = await app.fetch(
			new Request('http://localhost/api/verify-credentials', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: 'not json{',
			}),
		);
		expect(res.status).toBe(400);
		expect(await res.json()).toEqual({ error: 'Invalid JSON body' });
	});

	it('does not misreport valid-but-falsy JSON as "Invalid JSON body"', async () => {
		// Regression: a falsy JSON body (false, 0, "") is valid JSON that fails
		// the schema; it must be reported as an invalid request body, NOT as
		// "Invalid JSON body".
		for (const falsyBody of ['false', '0', '""']) {
			const res = await app.fetch(
				new Request('http://localhost/api/verify-credentials', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: falsyBody,
				}),
			);
			expect(res.status).toBe(400);
			const body = await res.json();
			expect(body.error).not.toBe('Invalid JSON body');
		}
	});
});
