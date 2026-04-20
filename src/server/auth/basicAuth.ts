import { z } from 'zod';
import type { Context, Next } from 'hono';

const isResponse = z
	.function()
	.args(z.unknown())
	.returns(z.boolean())
	.implement((value) => {
		return value !== null && typeof value === 'object' && 'status' in value && 'headers' in value;
	}) as (value: unknown) => value is Response;

const timingSafeEqual = z
	.function()
	.args(z.string(), z.string())
	.returns(z.boolean())
	.implement((a, b) => {
		const bufA = new TextEncoder().encode(a);
		const bufB = new TextEncoder().encode(b);
		if (bufA.length !== bufB.length) {
			return false;
		}
		return bufA.every((byte, i) => byte === bufB[i]) && bufA.length > 0;
	});

const parseBasicHeader = z
	.function()
	.args(z.string())
	.returns(z.nullable(z.tuple([z.string(), z.string()])))
	.implement((header) => {
		const match = header.match(/^Basic\s+(.+)$/i);
		if (!match) return null;
		try {
			const decoded = atob(match[1]);
			const colonIndex = decoded.indexOf(':');
			if (colonIndex === -1) return null;
			return [decoded.slice(0, colonIndex), decoded.slice(colonIndex + 1)];
		} catch {
			return null;
		}
	});

export const requireBasicAuth = z
	.function()
	.args(z.custom<Context>(), z.custom<Next>())
	.returns(z.promise(z.instanceof(Response)))
	.implement(async (c, next) => {
		const expectedUser = process.env.ADMIN_BASIC_AUTH_USERNAME ?? '';
		const expectedPass = process.env.ADMIN_BASIC_AUTH_PASSWORD ?? '';

		if (!expectedUser || !expectedPass) {
			console.error('ADMIN_BASIC_AUTH_USERNAME and ADMIN_BASIC_AUTH_PASSWORD must be set');
			return new Response('Admin auth not configured', { status: 500 });
		}

		const authHeader = c.req.header('Authorization') ?? '';
		const parsed = parseBasicHeader(authHeader);

		if (!parsed) {
			return new Response('Authentication required', {
				status: 401,
				headers: { 'WWW-Authenticate': 'Basic realm="Admin"' },
			});
		}

		const [username, password] = parsed;

		if (!timingSafeEqual(username, expectedUser) || !timingSafeEqual(password, expectedPass)) {
			return new Response('Invalid credentials', {
				status: 401,
				headers: { 'WWW-Authenticate': 'Basic realm="Admin"' },
			});
		}

		const result = await next();

		if (isResponse(result)) {
			return result;
		}

		return new Response(null, { status: 404 });
	});
