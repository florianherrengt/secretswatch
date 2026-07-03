import { z } from 'zod';
import { Hono } from 'hono';
import type { Context } from 'hono';
import { verifyRequestSchema } from './contracts.js';
import { getVerifier } from './registry.js';

const verifyRoutes = new Hono();

verifyRoutes.post(
	'/verify-credentials',
	z
		.function()
		.args(z.custom<Context>())
		.returns(z.custom<Response | Promise<Response>>())
		.implement(async (c) => {
			const bodyResult = await c.req.json().then(
				(data) => data,
				() => null,
			);

			// `null` is the rejection sentinel from the catch above. A valid
			// JSON body that happens to be falsy (e.g. `false`, `0`, `""`)
			// must not be reported as "Invalid JSON"; it is valid JSON that
			// simply fails the schema below.
			if (bodyResult === null) {
				return c.json({ error: 'Invalid JSON body' }, 400);
			}

			const parsed = verifyRequestSchema.safeParse(bodyResult);

			if (!parsed.success) {
				return c.json({ error: 'Invalid request body' }, 400);
			}

			const verifier = getVerifier(parsed.data.provider);
			const result = await verifier.verify(parsed.data.credentials);

			// Only expose `valid` on the public JSON API; `reason` is internal
			// diagnostics used by the UI and is not part of the documented
			// response shape.
			return c.json({ valid: result.valid });
		}),
);

export default verifyRoutes;
