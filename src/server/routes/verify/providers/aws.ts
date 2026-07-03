import { z } from 'zod';
import type { CredentialVerifier } from '../contracts.js';

export const awsCredentialsSchema = z.object({
	accessKeyId: z.string().min(1),
	secretAccessKey: z.string().min(1),
});

const AWS_ACCESS_KEY_ID_PATTERN = /^AKIA[0-9A-Z]{16}$/;
const AWS_SECRET_KEY_MIN_LENGTH = 40;

export const verifyAws = z
	.function()
	.args(z.record(z.string(), z.unknown()))
	.returns(
		z.promise(z.object({ valid: z.boolean(), reason: z.enum(['rejected', 'error']).optional() })),
	)
	.implement(async (credentials) => {
		const parsed = awsCredentialsSchema.safeParse(credentials);
		if (!parsed.success) {
			return { valid: false, reason: 'rejected' };
		}

		const { accessKeyId, secretAccessKey } = parsed.data;

		const hasValidKeyId = AWS_ACCESS_KEY_ID_PATTERN.test(accessKeyId);
		const hasValidSecret = secretAccessKey.length >= AWS_SECRET_KEY_MIN_LENGTH;

		const valid = hasValidKeyId && hasValidSecret;
		return { valid, reason: valid ? undefined : 'rejected' };
	});

export const awsVerifier: CredentialVerifier = {
	credentialsSchema: awsCredentialsSchema,
	verify: verifyAws,
};
