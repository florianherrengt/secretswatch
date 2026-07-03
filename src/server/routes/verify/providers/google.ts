import { z } from 'zod';
import type { CredentialVerifier } from '../contracts.js';

export const googleCredentialsSchema = z.object({
	apiKey: z.string().min(1),
});

export const verifyGoogle = z
	.function()
	.args(z.record(z.string(), z.unknown()))
	.returns(
		z.promise(z.object({ valid: z.boolean(), reason: z.enum(['rejected', 'error']).optional() })),
	)
	.implement(async (credentials) => {
		const parsed = googleCredentialsSchema.safeParse(credentials);
		if (!parsed.success) {
			return { valid: false, reason: 'rejected' };
		}

		try {
			const response = await fetch(
				`https://www.googleapis.com/oauth2/v1/tokeninfo?key=${encodeURIComponent(parsed.data.apiKey)}`,
				{ signal: AbortSignal.timeout(10_000) },
			);
			return { valid: response.ok, reason: response.ok ? undefined : 'rejected' };
		} catch {
			return { valid: false, reason: 'error' };
		}
	});

export const googleVerifier: CredentialVerifier = {
	credentialsSchema: googleCredentialsSchema,
	verify: verifyGoogle,
};
