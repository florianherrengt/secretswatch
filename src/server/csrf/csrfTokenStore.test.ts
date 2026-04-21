import { describe, it, expect, afterEach, vi } from 'vitest';
import { randomUUID } from 'node:crypto';

const store = new Map<string, string>();

vi.mock('../scan/redis.js', () => ({
	ioredisClient: {
		set: (key: string, value: string, ..._args: unknown[]) => {
			store.set(key, value);
			return Promise.resolve('OK');
		},
		get: (key: string) => Promise.resolve(store.get(key) ?? null),
		del: (...keys: string[]) => {
			keys.forEach((k) => store.delete(k));
			return Promise.resolve(keys.length);
		},
		keys: (pattern: string) => {
			const prefix = pattern.replace('*', '');
			return Promise.resolve([...store.keys()].filter((k) => k.startsWith(prefix)));
		},
	},
}));

import { csrfTokenStore, clearCsrfTokens } from './csrfTokenStore.js';

describe('csrfTokenStore', () => {
	afterEach(async () => {
		await clearCsrfTokens();
	});

	it('stores and retrieves a token for a session', async () => {
		const sessionId = randomUUID();
		const token = 'test-csrf-token-' + randomUUID();

		await csrfTokenStore.set(sessionId, token, 3600);
		const result = await csrfTokenStore.get(sessionId);

		expect(result).toBe(token);
	});

	it('returns null for a non-existent session', async () => {
		const sessionId = randomUUID();
		const result = await csrfTokenStore.get(sessionId);

		expect(result).toBeNull();
	});

	it('removes a token when del is called', async () => {
		const sessionId = randomUUID();
		const token = 'test-csrf-token-' + randomUUID();

		await csrfTokenStore.set(sessionId, token, 3600);
		await csrfTokenStore.del(sessionId);
		const result = await csrfTokenStore.get(sessionId);

		expect(result).toBeNull();
	});

	it('overwrites an existing token', async () => {
		const sessionId = randomUUID();
		const token1 = 'token-1-' + randomUUID();
		const token2 = 'token-2-' + randomUUID();

		await csrfTokenStore.set(sessionId, token1, 3600);
		await csrfTokenStore.set(sessionId, token2, 3600);
		const result = await csrfTokenStore.get(sessionId);

		expect(result).toBe(token2);
	});
});
