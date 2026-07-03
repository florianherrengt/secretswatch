import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import type { Next } from 'hono';
import verifyUiRoutes from '../../src/server/routes/verify/ui.js';

// getSessionContextUser() reads c.get('sessionUser') first and short-circuits,
// so injecting `sessionUser: null` via middleware avoids any DB/session access.
const forceUnauthenticated = async (c: Parameters<Next>[0], next: Next) => {
	c.set('sessionUser', null);
	c.set('sessionId', null);
	await next();
};

const app = new Hono();
app.use('*', forceUnauthenticated);
app.route('/', verifyUiRoutes);

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

const postForm = (provider: string, apiKey: string) =>
	app.fetch(
		new Request('http://localhost/credential-checker', {
			method: 'POST',
			headers: { 'content-type': 'application/x-www-form-urlencoded' },
			body: new URLSearchParams({ provider, apiKey }).toString(),
		}),
	);

describe('POST /credential-checker (UI handler)', () => {
	beforeEach(() => {
		mockFetch.mockReset();
	});

	it('maps the single secret to { token } for github (not { apiKey })', async () => {
		// Regression: the handler used to pass { apiKey } to every verifier.
		// GitHub's schema requires { token }, so a valid token was always
		// reported invalid. A valid GitHub token must now be reported valid.
		mockFetch.mockResolvedValueOnce(new Response(null, { status: 200 }));
		const res = await postForm('github', 'ghp_validtoken');
		const html = await res.text();

		expect(mockFetch).toHaveBeenCalledOnce();
		const [url, init] = mockFetch.mock.calls[0];
		expect(String(url)).toBe('https://api.github.com/user');
		expect((init as RequestInit).headers).toMatchObject({
			Authorization: 'Bearer ghp_validtoken',
		});
		expect(html).toContain('This credential is active');
	});

	it('passes { apiKey } for single-field providers (openai)', async () => {
		mockFetch.mockResolvedValueOnce(new Response(null, { status: 200 }));
		await postForm('openai', 'sk-valid');
		const [url, init] = mockFetch.mock.calls[0];
		expect(String(url)).toBe('https://api.openai.com/v1/models');
		expect((init as RequestInit).headers).toMatchObject({
			Authorization: 'Bearer sk-valid',
		});
	});

	it('rejects aws as a provider from the single-field UI form', async () => {
		// Regression: aws requires { accessKeyId, secretAccessKey }, which the
		// single-field form cannot provide. It must not be accepted here.
		const res = await postForm('aws', 'AKIAIOSFODNN7EXAMPLE');
		expect(res.status).toBe(200);
		const html = await res.text();
		// No verification network call should have been made.
		expect(mockFetch).not.toHaveBeenCalled();
		// The page re-renders without a result (form-invalid path).
		expect(html).not.toContain('This credential is active');
		expect(html).not.toContain("doesn't work");
	});

	it('reports invalid when the provider rejects the credential', async () => {
		mockFetch.mockResolvedValueOnce(new Response(null, { status: 401 }));
		const res = await postForm('github', 'ghp_bad');
		const html = await res.text();
		// The badge shows a human label, not the raw internal enum.
		expect(html).toContain('Not working');
		expect(html).toContain('work (or has been revoked)');
		// The raw enum token must not leak as visible text.
		expect(html).not.toContain('>invalid<');
	});

	it('shows the "could not verify" error state on network failure, NOT revoked', async () => {
		// Regression: a timeout / network error used to be reported as
		// "doesn't work (or has been revoked)", falsely telling the user a
		// potentially-valid key was dead. It must now show the error badge.
		mockFetch.mockRejectedValueOnce(new Error('network failure'));
		const res = await postForm('github', 'ghp_maybevalid');
		const html = await res.text();

		expect(html).toContain('Could not verify');
		// And it must NOT claim the credential was revoked.
		expect(html).not.toContain('work (or has been revoked)');
	});

	it('re-renders the empty form instead of 500ing on a malformed body', async () => {
		// Regression: parseBody() throws on a malformed multipart body, which
		// used to bubble up as an unhandled 500. It must re-render the form.
		const res = await app.fetch(
			new Request('http://localhost/credential-checker', {
				method: 'POST',
				headers: { 'content-type': 'multipart/form-data; boundary=x' },
				body: '--x\r\nContent-Disposition: form-data; name="provider"\r\n\r\nopenai',
			}),
		);
		expect(res.status).toBe(200);
		const html = await res.text();
		// The page rendered without a result badge.
		expect(html).toContain('Check credential');
		expect(html).not.toContain('This credential is active');
		expect(mockFetch).not.toHaveBeenCalled();
	});
});
