import { z } from 'zod';
import type { Context, Next } from 'hono';
import { getSession } from './index.js';

type SessionUser = Awaited<ReturnType<typeof getSession>>;

export const isResponse = z
	.function()
	.args(z.unknown())
	.returns(z.boolean())
	.implement((value) => {
		return value !== null && typeof value === 'object' && 'status' in value && 'headers' in value;
	}) as (value: unknown) => value is Response;

export const extractSessionId = z
	.function()
	.args(z.custom<Context>())
	.returns(z.nullable(z.string()))
	.implement((c) => {
		const existingSessionId = c.get('sessionId') as string | null | undefined;

		if (existingSessionId !== undefined) {
			return existingSessionId;
		}

		return c.req.header('cookie')?.match(/session_id=([^;]+)/)?.[1] ?? null;
	});

export const getSessionContextUser = z
	.function()
	.args(z.custom<Context>())
	.returns(z.promise(z.custom<SessionUser>()))
	.implement(async (c) => {
		const existingSessionUser = c.get('sessionUser') as SessionUser | undefined;

		if (existingSessionUser !== undefined) {
			return existingSessionUser;
		}

		const sessionId = extractSessionId(c);

		if (!sessionId) {
			c.set('sessionId', null);
			c.set('sessionUser', null);
			return null;
		}

		const sessionUser = await getSession(sessionId);
		c.set('sessionId', sessionId);
		c.set('sessionUser', sessionUser);

		if (sessionUser) {
			c.set('user', sessionUser);
		}

		return sessionUser;
	});

export const sessionContextMiddleware = z
	.function()
	.args(z.custom<Context>(), z.custom<Next>())
	.returns(z.promise(z.void()))
	.implement(async (c, next) => {
		await getSessionContextUser(c);
		await next();
	});

export const requireAuth = z
	.function()
	.args(z.custom<Context>(), z.custom<Next>())
	.returns(z.promise(z.instanceof(Response)))
	.implement(async (c, next) => {
		const sessionId = extractSessionId(c);

		if (!sessionId) {
			return c.json(
				{
					error:
						'Authentication required. Please sign in to access this feature — unauthenticated access is not allowed for security reasons.',
				},
				401,
			);
		}

		const user = await getSessionContextUser(c);

		if (!user) {
			return c.json({ error: 'Invalid or expired session' }, 401);
		}

		c.set('user', user);
		const result = await next();

		if (isResponse(result)) {
			return result;
		}

		return c.text('', 200);
	});
