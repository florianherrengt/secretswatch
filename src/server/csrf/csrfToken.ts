import { z } from 'zod';
import type { Context, Next } from 'hono';
import { extractSessionId, getSessionContextUser } from '../auth/middleware.js';
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

		const session = await getSessionContextUser(c);

		if (!session) {
			await next();
			return;
		}

		const existingToken = await csrfTokenStore.get(sessionId);
		const createdToken = existingToken
			? null
			: await csrfTokenStore.createIfMissing(sessionId, generateToken(), CSRF_TOKEN_TTL_SECONDS);

		const csrfToken =
			createdToken ??
			(await (async () => {
				const token = existingToken ?? (await csrfTokenStore.get(sessionId));
				if (token) {
					await csrfTokenStore.set(sessionId, token, CSRF_TOKEN_TTL_SECONDS);
					return token;
				}
				return null;
			})());

		if (csrfToken) {
			c.set('csrfToken', csrfToken);
		}

		await next();
	});
