import { z } from 'zod';

export const providerSchema = z.enum(['openai', 'aws', 'github', 'google', 'stripe']);

export type Provider = z.infer<typeof providerSchema>;

export const verifyRequestSchema = z.object({
	provider: providerSchema,
	credentials: z.record(z.string(), z.unknown()),
});

export const verifyResponseSchema = z.object({
	valid: z.boolean(),
	/**
	 * Why the verification returned this result. The JSON API only exposes
	 * `valid`, but the UI uses `reason` to tell a rejected credential apart
	 * from an indeterminate failure (timeout / network error) so it does not
	 * tell the user a valid key has been revoked.
	 */
	reason: z.enum(['rejected', 'error']).optional(),
});

export type VerifyRequest = z.infer<typeof verifyRequestSchema>;
export type VerifyResponse = z.infer<typeof verifyResponseSchema>;

export type CredentialVerifier = {
	credentialsSchema: z.ZodType<Record<string, unknown>>;
	verify: (credentials: Record<string, unknown>) => Promise<VerifyResponse>;
};
