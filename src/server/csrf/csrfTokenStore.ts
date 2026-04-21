import { z } from 'zod';
import { ioredisClient } from '../scan/redis.js';

const CSRF_TOKEN_KEY_PREFIX = 'csrf_token:';

export const CSRF_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;

const csrfTokenKey = z
	.function()
	.args(z.string())
	.returns(z.string())
	.implement((sessionId) => `${CSRF_TOKEN_KEY_PREFIX}${sessionId}`);

export const csrfTokenStore = {
	set: z
		.function()
		.args(z.string(), z.string(), z.number().int().positive())
		.returns(z.promise(z.void()))
		.implement(async (sessionId, token, ttlSeconds) => {
			await ioredisClient.set(csrfTokenKey(sessionId), token, 'EX', ttlSeconds);
		}),

	get: z
		.function()
		.args(z.string())
		.returns(z.promise(z.nullable(z.string())))
		.implement(async (sessionId) => {
			return await ioredisClient.get(csrfTokenKey(sessionId));
		}),

	del: z
		.function()
		.args(z.string())
		.returns(z.promise(z.void()))
		.implement(async (sessionId) => {
			await ioredisClient.del(csrfTokenKey(sessionId));
		}),
};

export const clearCsrfTokens = z
	.function()
	.returns(z.promise(z.void()))
	.implement(async () => {
		const keys = await ioredisClient.keys(`${CSRF_TOKEN_KEY_PREFIX}*`);
		if (keys.length > 0) {
			await ioredisClient.del(...keys);
		}
	});
