import { z } from 'zod';
import type { CredentialVerifier, Provider } from './contracts.js';
import { openAiVerifier } from './providers/openai.js';
import { awsVerifier } from './providers/aws.js';
import { gitHubVerifier } from './providers/github.js';
import { googleVerifier } from './providers/google.js';
import { stripeVerifier } from './providers/stripe.js';

const registry: Record<Provider, CredentialVerifier> = {
	openai: openAiVerifier,
	aws: awsVerifier,
	github: gitHubVerifier,
	google: googleVerifier,
	stripe: stripeVerifier,
};

export const getVerifier = z
	.function()
	.args(z.custom<Provider>())
	.returns(z.custom<CredentialVerifier>())
	.implement((provider) => {
		return registry[provider];
	});
