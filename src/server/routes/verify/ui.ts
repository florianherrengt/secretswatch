import { z } from 'zod';
import { Hono } from 'hono';
import type { Context } from 'hono';
import { render } from '../../../lib/response.js';
import { getVerifier } from './registry.js';
import {
	CredentialCheckerPage,
	credentialCheckerPagePropsSchema,
} from '../../../views/pages/credentialChecker.js';
import { getSessionContextUser } from '../../auth/middleware.js';

const verifyUiRoutes = new Hono();

// The checker UI collects a single secret, so only providers whose credentials
// can be expressed as a single value are supported here. AWS needs both an
// access key id and a secret access key, so it is intentionally excluded from
// the form (it remains available via the JSON API).
const checkerProviderSchema = z.enum(['openai', 'github', 'google', 'stripe']);

const checkerFormSchema = z.object({
	provider: checkerProviderSchema,
	apiKey: z.string().min(1),
});

verifyUiRoutes.get(
	'/credential-checker',
	z
		.function()
		.args(z.custom<Context>())
		.returns(z.custom<Response | Promise<Response>>())
		.implement(async (c) => {
			const session = await getSessionContextUser(c);
			const props = credentialCheckerPagePropsSchema.parse({
				isLoggedIn: session !== null,
			});
			return c.html(render(CredentialCheckerPage, props));
		}),
);

verifyUiRoutes.post(
	'/credential-checker',
	z
		.function()
		.args(z.custom<Context>())
		.returns(z.custom<Response | Promise<Response>>())
		.implement(async (c) => {
			const session = await getSessionContextUser(c);
			// parseBody() throws on a malformed multipart body (e.g. a client
			// hitting this form endpoint with a broken content-type). Treat
			// that the same as any other invalid submission and re-render the
			// empty form instead of surfacing a 500.
			const body = await c.req.parseBody().catch(() => null);
			const parsed = checkerFormSchema.safeParse({
				provider: body && typeof body.provider === 'string' ? body.provider : '',
				apiKey: body && typeof body.apiKey === 'string' ? body.apiKey : '',
			});

			if (!parsed.success) {
				const props = credentialCheckerPagePropsSchema.parse({
					isLoggedIn: session !== null,
				});
				return c.html(render(CredentialCheckerPage, props));
			}

			const verifier = getVerifier(parsed.data.provider);
			// The UI collects a single secret, but each provider expects a
			// specific credential shape. Map the submitted secret into the
			// shape the selected verifier validates against.
			const credentialsForProvider: Record<string, unknown> =
				parsed.data.provider === 'github'
					? { token: parsed.data.apiKey }
					: { apiKey: parsed.data.apiKey };
			const verificationResult = await verifier
				.verify(credentialsForProvider)
				.then((r) => r)
				.catch(() => ({ valid: false, reason: 'error' as const }));
			// Distinguish "the provider rejected the credential" from "we could
			// not reach the provider" so a timeout never tells the user their
			// key has been revoked.
			const result = verificationResult.valid
				? 'valid'
				: verificationResult.reason === 'error'
					? 'error'
					: 'invalid';

			const props = credentialCheckerPagePropsSchema.parse({
				provider: parsed.data.provider,
				apiKey: parsed.data.apiKey,
				result,
				isLoggedIn: session !== null,
			});
			return c.html(render(CredentialCheckerPage, props));
		}),
);

export default verifyUiRoutes;
