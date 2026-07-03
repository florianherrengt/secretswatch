import { z } from 'zod';
import type { CredentialVerifier } from '../contracts.js';

export const gitHubCredentialsSchema = z.object({
	token: z.string().min(1),
});

export const verifyGitHub = z
	.function()
	.args(z.record(z.string(), z.unknown()))
	.returns(
		z.promise(z.object({ valid: z.boolean(), reason: z.enum(['rejected', 'error']).optional() })),
	)
	.implement(async (credentials) => {
		const parsed = gitHubCredentialsSchema.safeParse(credentials);
		if (!parsed.success) {
			return { valid: false, reason: 'rejected' };
		}

		try {
			const response = await fetch('https://api.github.com/user', {
				headers: {
					Authorization: `Bearer ${parsed.data.token}`,
					'User-Agent': 'secret-detector-verify',
				},
				signal: AbortSignal.timeout(10_000),
			});
			return { valid: response.ok, reason: response.ok ? undefined : 'rejected' };
		} catch {
			return { valid: false, reason: 'error' };
		}
	});

export const gitHubVerifier: CredentialVerifier = {
	credentialsSchema: gitHubCredentialsSchema,
	verify: verifyGitHub,
};
