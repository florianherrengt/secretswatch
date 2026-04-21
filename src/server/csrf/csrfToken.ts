import { z } from 'zod';
import type { Context, Next } from 'hono';
import { extractSessionId } from '../auth/middleware.js';
import { generateToken } from '../auth/crypto.js';
import { csrfTokenStore, CSRF_TOKEN_TTL_SECONDS } from './csrfTokenStore.js';

export const csrfTokenInjection = z
	.function()
	.args(z.custom<Context>(), z.custom<Next>())
	.returns(z.promise(z.void()))
	.implement(async (c, next) => {
		const sessionId = extractSessionId(c);

		if (!sessionId) {
			await next();
			return;
		}

		const storedToken = await csrfTokenStore.get(sessionId);

		if (storedToken) {
			await csrfTokenStore.set(sessionId, storedToken, CSRF_TOKEN_TTL_SECONDS);
			c.set('csrfToken', storedToken);
		} else {
			const rawToken = generateToken();
			await csrfTokenStore.set(sessionId, rawToken, CSRF_TOKEN_TTL_SECONDS);
			c.set('csrfToken', rawToken);
		}

		await next();
	});
