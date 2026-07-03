import { z } from 'zod';
import type { CredentialVerifier } from '../contracts.js';

export const openAiCredentialsSchema = z.object({
	apiKey: z.string().min(1),
});

export const verifyOpenAi = z
	.function()
	.args(z.record(z.string(), z.unknown()))
	.returns(
		z.promise(z.object({ valid: z.boolean(), reason: z.enum(['rejected', 'error']).optional() })),
	)
	.implement(async (credentials) => {
		const parsed = openAiCredentialsSchema.safeParse(credentials);
		if (!parsed.success) {
			return { valid: false, reason: 'rejected' };
		}

		try {
			const response = await fetch('https://api.openai.com/v1/models', {
				headers: { Authorization: `Bearer ${parsed.data.apiKey}` },
				signal: AbortSignal.timeout(10_000),
			});
			return { valid: response.ok, reason: response.ok ? undefined : 'rejected' };
		} catch {
			return { valid: false, reason: 'error' };
		}
	});

export const openAiVerifier: CredentialVerifier = {
	credentialsSchema: openAiCredentialsSchema,
	verify: verifyOpenAi,
};
