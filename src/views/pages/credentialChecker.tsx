import { z } from 'zod';
import type { FC } from 'hono/jsx';
import { Layout } from '../layout.js';
import { providerSchema } from '../../server/routes/verify/contracts.js';

export const credentialCheckerPagePropsSchema = z.object({
	provider: providerSchema.optional(),
	apiKey: z.string().optional(),
	result: z.enum(['valid', 'invalid', 'error']).optional(),
	isLoggedIn: z.boolean(),
});

export type CredentialCheckerPageProps = z.infer<typeof credentialCheckerPagePropsSchema>;

export const CredentialCheckerPage: FC<CredentialCheckerPageProps> = z
	.function()
	.args(credentialCheckerPagePropsSchema)
	.returns(z.custom<ReturnType<FC<CredentialCheckerPageProps>>>())
	.implement(({ provider, apiKey, result, isLoggedIn: _isLoggedIn }) => {
		const resultConfig = result
			? {
					valid: {
						badge: 'Active',
						label: 'This credential is active',
						variant: 'success' as const,
					},
					invalid: {
						badge: 'Not working',
						label: "This credential doesn't work (or has been revoked)",
						variant: 'error' as const,
					},
					error: {
						badge: 'Unknown',
						label: 'Could not verify — try again',
						variant: 'warning' as const,
					},
				}[result]
			: null;

		const resultVariantClass = resultConfig
			? resultConfig.variant === 'success'
				? 'border-success/25 bg-success/10 text-success'
				: resultConfig.variant === 'error'
					? 'border-error/25 bg-error/10 text-error'
					: 'border-warning/25 bg-warning/10 text-warning'
			: '';

		const classes = [
			'inline-flex items-center rounded-full border px-2 py-0.5 text-sm font-medium',
			resultVariantClass,
		]
			.join(' ')
			.trim();

		return (
			<Layout title="Credential Checker">
				<div class="flex grow items-center justify-center py-8">
					<div class="w-full max-w-lg rounded-xl border border-border bg-card p-6 sm:p-8">
						<div class="mb-6 space-y-2 text-center">
							<h1 class="text-2xl font-semibold text-foreground">Is your API key exposed?</h1>
							<p class="text-sm text-muted-foreground">
								Check if a credential is valid — see how fast an attacker could use a leaked key.
							</p>
						</div>

						<form method="post" action="/credential-checker" class="space-y-4">
							<div>
								<label for="provider" class="mb-1 block text-sm font-medium text-foreground">
									Provider
								</label>
								<select
									id="provider"
									name="provider"
									class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
								>
									<option value="openai" selected={provider === 'openai' || !provider}>
										OpenAI
									</option>
									<option value="github" selected={provider === 'github'}>
										GitHub
									</option>
									<option value="google" selected={provider === 'google'}>
										Google
									</option>
									<option value="stripe" selected={provider === 'stripe'}>
										Stripe
									</option>
								</select>
							</div>

							<div>
								<label for="apiKey" class="mb-1 block text-sm font-medium text-foreground">
									API Key
								</label>
								<input
									id="apiKey"
									name="apiKey"
									type="password"
									required
									placeholder="sk-..."
									value={apiKey ?? ''}
									class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
								/>
							</div>

							<button
								type="submit"
								class="w-full cursor-pointer rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
							>
								Check credential
							</button>
						</form>

						{resultConfig ? (
							<div class="mt-4 rounded-lg border border-border p-4 text-center">
								<span class={classes}>{resultConfig.badge}</span>
								<p class="mt-2 text-sm text-foreground">{resultConfig.label}</p>
							</div>
						) : null}

						{result ? (
							<div class="mt-4 text-center text-sm text-muted-foreground">
								Secrets Watch scans websites for exposed API keys.{' '}
								<a href="/" class="text-primary underline">
									Scan your site →
								</a>
							</div>
						) : null}
					</div>
				</div>
			</Layout>
		);
	});
