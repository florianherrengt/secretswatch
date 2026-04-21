import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { validateCsrfToken } from './validateCsrf.js';
import { csrfTokenStore } from './csrfTokenStore.js';
import { extractSessionId } from '../auth/middleware.js';
import { getClientIp } from '../http/clientIp.js';
import { timingSafeEqual } from '../auth/crypto.js';

vi.mock('./csrfTokenStore.js', () => ({
	csrfTokenStore: {
		get: vi.fn(),
	},
}));

vi.mock('../auth/middleware.js', () => ({
	extractSessionId: vi.fn(),
}));

vi.mock('../http/clientIp.js', () => ({
	getClientIp: vi.fn(),
}));

vi.mock('../auth/crypto.js', () => ({
	timingSafeEqual: vi.fn(),
}));

const createApp = () => {
	const app = new Hono();
	app.post('/', validateCsrfToken, async (c) => {
		return c.text('ok');
	});
	return app;
};

describe('validateCsrfToken', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('calls next() when token matches', async () => {
		vi.mocked(extractSessionId).mockReturnValue('session-123');
		vi.mocked(csrfTokenStore.get).mockResolvedValue('stored-token');
		vi.mocked(timingSafeEqual).mockReturnValue(true);
		vi.mocked(getClientIp).mockReturnValue('127.0.0.1');

		const app = createApp();
		const res = await app.request('/', {
			method: 'POST',
			headers: { 'content-type': 'application/x-www-form-urlencoded' },
			body: '_csrf=stored-token',
		});

		expect(res.status).toBe(200);
		expect(await res.text()).toBe('ok');
	});

	it('returns 403 when _csrf field is missing', async () => {
		vi.mocked(extractSessionId).mockReturnValue('session-123');
		vi.mocked(csrfTokenStore.get).mockResolvedValue('stored-token');
		vi.mocked(getClientIp).mockReturnValue('127.0.0.1');

		const app = createApp();
		const res = await app.request('/', {
			method: 'POST',
			headers: { 'content-type': 'application/x-www-form-urlencoded' },
			body: 'domain=example.com',
		});

		expect(res.status).toBe(403);
	});

	it('returns 403 when _csrf is an empty string', async () => {
		vi.mocked(extractSessionId).mockReturnValue('session-123');
		vi.mocked(csrfTokenStore.get).mockResolvedValue('stored-token');
		vi.mocked(getClientIp).mockReturnValue('127.0.0.1');

		const app = createApp();
		const res = await app.request('/', {
			method: 'POST',
			headers: { 'content-type': 'application/x-www-form-urlencoded' },
			body: '_csrf=',
		});

		expect(res.status).toBe(403);
	});

	it('returns 403 when token does not match', async () => {
		vi.mocked(extractSessionId).mockReturnValue('session-123');
		vi.mocked(csrfTokenStore.get).mockResolvedValue('stored-token');
		vi.mocked(timingSafeEqual).mockReturnValue(false);
		vi.mocked(getClientIp).mockReturnValue('127.0.0.1');

		const app = createApp();
		const res = await app.request('/', {
			method: 'POST',
			headers: { 'content-type': 'application/x-www-form-urlencoded' },
			body: '_csrf=wrong-token',
		});

		expect(res.status).toBe(403);
	});

	it('returns 403 when stored token is null', async () => {
		vi.mocked(extractSessionId).mockReturnValue('session-123');
		vi.mocked(csrfTokenStore.get).mockResolvedValue(null);
		vi.mocked(getClientIp).mockReturnValue('127.0.0.1');

		const app = createApp();
		const res = await app.request('/', {
			method: 'POST',
			headers: { 'content-type': 'application/x-www-form-urlencoded' },
			body: '_csrf=some-token',
		});

		expect(res.status).toBe(403);
	});

	it('skips validation for JSON content-type', async () => {
		vi.mocked(extractSessionId).mockReturnValue('session-123');
		vi.mocked(getClientIp).mockReturnValue('127.0.0.1');

		const app = createApp();
		const res = await app.request('/', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ field: 'value' }),
		});

		expect(res.status).toBe(200);
		expect(await res.text()).toBe('ok');
	});

	it('returns 403 when no session cookie is present', async () => {
		vi.mocked(extractSessionId).mockReturnValue(null);
		vi.mocked(getClientIp).mockReturnValue('127.0.0.1');

		const app = createApp();
		const res = await app.request('/', {
			method: 'POST',
			headers: { 'content-type': 'application/x-www-form-urlencoded' },
			body: '_csrf=some-token',
		});

		expect(res.status).toBe(403);
	});

	it('returns 403 for text/plain content-type (parseBody does not parse form data)', async () => {
		vi.mocked(extractSessionId).mockReturnValue('session-123');
		vi.mocked(getClientIp).mockReturnValue('127.0.0.1');

		const app = createApp();
		const res = await app.request('/', {
			method: 'POST',
			headers: { 'content-type': 'text/plain' },
			body: '_csrf=stored-token',
		});

		expect(res.status).toBe(403);
	});
});
