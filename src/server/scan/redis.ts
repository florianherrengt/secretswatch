import Redis from 'ioredis';
import { z } from 'zod';
import { getRedisUrl } from '../config.js';

export const redisUrl = getRedisUrl();

export const ioredisClient = new Redis(redisUrl, {
	enableOfflineQueue: false,
	maxRetriesPerRequest: null,
});

// ioredis emits 'error' on connection failures. With no listener Node treats
// it as an unhandled emitter error and crashes the process — so any Redis
// blip/restart would take the whole app down instead of letting ioredis
// reconnect. Attach a listener so the error is observable but non-fatal;
// ioredis keeps reconnecting on its own.
const handleRedisError = z
	.function()
	.args(z.custom<Error>())
	.returns(z.void())
	.implement((error) => {
		console.error('[redis] Connection error', {
			message: error.message,
			code: 'code' in error ? (error as { code?: unknown }).code : undefined,
		});
	});

ioredisClient.on('error', handleRedisError);
