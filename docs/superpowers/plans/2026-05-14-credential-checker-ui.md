# Credential Checker UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `/credential-checker` page with a form that checks API credentials and shows the result.

**Architecture:** Server-rendered page using existing Layout and design system. Standard form POST, page re-renders with result. Uses the existing `verifyRequestSchema` and `getVerifier` from the verify module.

**Tech Stack:** Hono, Zod, JSX templates (hono/jsx), Tailwind CSS, vitest

---

### Task 1: Page component

**Files:**

- Create: `src/views/pages/credentialChecker.tsx`

- [ ] **Step 1: Write the page component**

The page takes optional `provider`, `apiKey`, and `result` props. When `result` is present it shows the result below the form.

```tsx
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
	.implement(({ provider, apiKey, result, isLoggedIn }) => {
		const resultConfig = result
			? {
					valid: { label: 'This credential is active', variant: 'success' as const },
					invalid: {
						label: "This credential doesn't work (or has been revoked)",
						variant: 'error' as const,
					},
					error: { label: 'Could not verify — try again', variant: 'warning' as const },
				}[result]
			: null;

		return (
			<Layout title="Credential Checker" topNavMode={isLoggedIn ? 'app' : 'auth'}>
				<div class="mx-auto flex min-h-screen max-w-6xl flex-col px-4 sm:px-6">
					<section class="flex flex-1 items-center justify-center py-8">
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
										<option value="aws" selected={provider === 'aws'}>
											AWS
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
									<span
										class={`inline-flex items-center rounded-full border px-2 py-0.5 text-sm font-medium ${
											resultConfig.variant === 'success'
												? 'border-success/25 bg-success/10 text-success'
												: resultConfig.variant === 'error'
													? 'border-error/25 bg-error/10 text-error'
													: 'border-warning/25 bg-warning/10 text-warning'
										}`}
									>
										{result}
									</span>
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
					</section>
				</div>
			</Layout>
		);
	});
```

- [ ] **Step 2: Run typecheck**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Run lint**

Run: `npx eslint src/views/pages/credentialChecker.tsx`
Expected: PASS (fix any design-system rule violations)

- [ ] **Step 4: Commit**

```bash
git add src/views/pages/credentialChecker.tsx
git commit -m "feat(verify): add credential checker page component"
```

---

### Task 2: UI route handler

**Files:**

- Create: `src/server/routes/verify/ui.ts`

- [ ] **Step 1: Write the route handler**

GET renders the empty form. POST validates and re-renders with result.

```ts
import { z } from 'zod';
import { Hono } from 'hono';
import type { Context } from 'hono';
import { render } from '../../../lib/response.js';
import { providerSchema } from './contracts.js';
import { getVerifier } from './registry.js';
import {
	CredentialCheckerPage,
	credentialCheckerPagePropsSchema,
} from '../../../views/pages/credentialChecker.js';
import { getSessionContextUser } from '../../auth/middleware.js';

const verifyUiRoutes = new Hono();

const checkerFormSchema = z.object({
	provider: providerSchema,
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
			const body = await c.req.parseBody();
			const parsed = checkerFormSchema.safeParse({
				provider: typeof body.provider === 'string' ? body.provider : '',
				apiKey: typeof body.apiKey === 'string' ? body.apiKey : '',
			});

			if (!parsed.success) {
				const props = credentialCheckerPagePropsSchema.parse({
					isLoggedIn: session !== null,
				});
				return c.html(render(CredentialCheckerPage, props));
			}

			const verifier = getVerifier(parsed.data.provider);
			let result: 'valid' | 'invalid' | 'error' = 'invalid';

			try {
				const response = await verifier.verify({ apiKey: parsed.data.apiKey });
				result = response.valid ? 'valid' : 'invalid';
			} catch {
				result = 'error';
			}

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
```

- [ ] **Step 2: Run typecheck**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/server/routes/verify/ui.ts
git commit -m "feat(verify): add GET/POST /credential-checker route"
```

---

### Task 3: Mount route in app

**Files:**

- Modify: `src/server/routes/index.ts`

- [ ] **Step 1: Add the import**

After the existing `import verifyRoutes` line, add:

```ts
import verifyUiRoutes from './verify/ui.js';
```

- [ ] **Step 2: Mount the UI route**

After the existing `app.route('/api', verifyRoutes);` line, add:

```ts
app.route('/', verifyUiRoutes);
```

This mounts it after the CSRF middleware (which is fine — the form submits with CSRF via the session).

- [ ] **Step 3: Run typecheck**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 4: Run lint**

Run: `npx eslint src/server/routes/index.ts src/server/routes/verify/ui.ts src/views/pages/credentialChecker.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/server/routes/index.ts
git commit -m "feat(verify): mount credential checker UI route"
```

---

### Task 4: Verify and test

- [ ] **Step 1: Run typecheck**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 2: Run lint**

Run: `npx eslint src/`
Expected: PASS

- [ ] **Step 3: Run verify provider tests**

Run: `npx vitest run --config vitest.verify.config.ts`
Expected: All tests pass

- [ ] **Step 4: Manual test**

Start the dev server (`npm run dev`) and visit `http://localhost:3000/credential-checker`. Test:

- Page loads with form
- Submitting an invalid key shows "invalid" result
- Result area shows CTA link
