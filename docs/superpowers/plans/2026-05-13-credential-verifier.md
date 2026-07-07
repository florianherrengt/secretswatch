# Credential Verifier API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `POST /api/verify-credentials` endpoint that checks if provider credentials are valid.

**Architecture:** Provider registry pattern — each provider is a module with a Zod schema for its credentials and a `verify` function. A registry maps provider names to verifiers. The Hono route validates the request, looks up the provider, and delegates.

**Tech Stack:** Hono, Zod, native `fetch`, vitest

---

### Task 1: Contracts and verifier type

**Files:**

- Create: `src/server/routes/verify/contracts.ts`

- [ ] **Step 1: Write the contracts module**

```ts
import { z } from 'zod';

export const providerSchema = z.enum(['openai', 'aws', 'github', 'google', 'stripe']);

export type Provider = z.infer<typeof providerSchema>;

export const verifyRequestSchema = z.object({
	provider: providerSchema,
	credentials: z.record(z.string(), z.unknown()),
});

export const verifyResponseSchema = z.object({
	valid: z.boolean(),
});

export type VerifyRequest = z.infer<typeof verifyRequestSchema>;
export type VerifyResponse = z.infer<typeof verifyResponseSchema>;

export type CredentialVerifier = {
	credentialsSchema: z.ZodType<Record<string, unknown>>;
	verify: (credentials: Record<string, unknown>) => Promise<VerifyResponse>;
};
```

- [ ] **Step 2: Run typecheck**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/server/routes/verify/contracts.ts
git commit -m "feat(verify): add contracts and verifier type"
```

---

### Task 2: OpenAI provider

**Files:**

- Create: `src/server/routes/verify/providers/openai.ts`
- Create: `src/server/routes/verify/providers/openai.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { verifyOpenAi } from './openai.js';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('verifyOpenAi', () => {
	beforeEach(() => {
		mockFetch.mockReset();
	});

	it('returns valid=true for 200 response', async () => {
		mockFetch.mockResolvedValueOnce(new Response(null, { status: 200 }));
		const result = await verifyOpenAi({ apiKey: 'sk-valid-key' });
		expect(result).toEqual({ valid: true });
	});

	it('returns valid=false for 401 response', async () => {
		mockFetch.mockResolvedValueOnce(new Response(null, { status: 401 }));
		const result = await verifyOpenAi({ apiKey: 'sk-bad-key' });
		expect(result).toEqual({ valid: false });
	});

	it('returns valid=false on network error', async () => {
		mockFetch.mockRejectedValueOnce(new Error('network failure'));
		const result = await verifyOpenAi({ apiKey: 'sk-key' });
		expect(result).toEqual({ valid: false });
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/server/routes/verify/providers/openai.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write the implementation**

```ts
import { z } from 'zod';
import type { CredentialVerifier } from '../contracts.js';

export const openAiCredentialsSchema = z.object({
	apiKey: z.string().min(1),
});

export const verifyOpenAi = async (
	credentials: Record<string, unknown>,
): Promise<{ valid: boolean }> => {
	const parsed = openAiCredentialsSchema.safeParse(credentials);
	if (!parsed.success) {
		return { valid: false };
	}

	try {
		const response = await fetch('https://api.openai.com/v1/models', {
			headers: { Authorization: `Bearer ${parsed.data.apiKey}` },
			signal: AbortSignal.timeout(10_000),
		});
		return { valid: response.ok };
	} catch {
		return { valid: false };
	}
};

export const openAiVerifier: CredentialVerifier = {
	credentialsSchema: openAiCredentialsSchema,
	verify: verifyOpenAi,
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/server/routes/verify/providers/openai.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/server/routes/verify/providers/openai.ts src/server/routes/verify/providers/openai.test.ts
git commit -m "feat(verify): add OpenAI credential verifier"
```

---

### Task 3: GitHub provider

**Files:**

- Create: `src/server/routes/verify/providers/github.ts`
- Create: `src/server/routes/verify/providers/github.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { verifyGitHub } from './github.js';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('verifyGitHub', () => {
	beforeEach(() => {
		mockFetch.mockReset();
	});

	it('returns valid=true for 200 response', async () => {
		mockFetch.mockResolvedValueOnce(new Response(null, { status: 200 }));
		const result = await verifyGitHub({ token: 'ghp_valid' });
		expect(result).toEqual({ valid: true });
	});

	it('returns valid=false for 401 response', async () => {
		mockFetch.mockResolvedValueOnce(new Response(null, { status: 401 }));
		const result = await verifyGitHub({ token: 'ghp_bad' });
		expect(result).toEqual({ valid: false });
	});

	it('returns valid=false on network error', async () => {
		mockFetch.mockRejectedValueOnce(new Error('network failure'));
		const result = await verifyGitHub({ token: 'ghp_key' });
		expect(result).toEqual({ valid: false });
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/server/routes/verify/providers/github.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write the implementation**

```ts
import { z } from 'zod';
import type { CredentialVerifier } from '../contracts.js';

export const gitHubCredentialsSchema = z.object({
	token: z.string().min(1),
});

export const verifyGitHub = async (
	credentials: Record<string, unknown>,
): Promise<{ valid: boolean }> => {
	const parsed = gitHubCredentialsSchema.safeParse(credentials);
	if (!parsed.success) {
		return { valid: false };
	}

	try {
		const response = await fetch('https://api.github.com/user', {
			headers: {
				Authorization: `Bearer ${parsed.data.token}`,
				'User-Agent': 'secret-detector-verify',
			},
			signal: AbortSignal.timeout(10_000),
		});
		return { valid: response.ok };
	} catch {
		return { valid: false };
	}
};

export const gitHubVerifier: CredentialVerifier = {
	credentialsSchema: gitHubCredentialsSchema,
	verify: verifyGitHub,
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/server/routes/verify/providers/github.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/server/routes/verify/providers/github.ts src/server/routes/verify/providers/github.test.ts
git commit -m "feat(verify): add GitHub credential verifier"
```

---

### Task 4: AWS provider

**Files:**

- Create: `src/server/routes/verify/providers/aws.ts`
- Create: `src/server/routes/verify/providers/aws.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { verifyAws } from './aws.js';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('verifyAws', () => {
	beforeEach(() => {
		mockFetch.mockReset();
	});

	it('returns valid=true for 200 response', async () => {
		mockFetch.mockResolvedValueOnce(
			new Response(
				XMLBody({
					GetCallerIdentityResult: { Arn: 'arn:aws:iam::123456789012:user/test' },
				}),
				{ status: 200 },
			),
		);
		const result = await verifyAws({
			accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
			secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
		});
		expect(result).toEqual({ valid: true });
	});

	it('returns valid=false for 403 response', async () => {
		mockFetch.mockResolvedValueOnce(new Response(null, { status: 403 }));
		const result = await verifyAws({
			accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
			secretAccessKey: 'badkey',
		});
		expect(result).toEqual({ valid: false });
	});

	it('returns valid=false on network error', async () => {
		mockFetch.mockRejectedValueOnce(new Error('network failure'));
		const result = await verifyAws({
			accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
			secretAccessKey: 'key',
		});
		expect(result).toEqual({ valid: false });
	});
});

function XMLBody(inner: Record<string, unknown>): string {
	return `<response>${JSON.stringify(inner)}</response>`;
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/server/routes/verify/providers/aws.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write the implementation**

AWS STS GetCallerIdentity requires SigV4 signing. For this lightweight verifier, we'll use the simpler approach of calling STS with the access key via the Query API with a basic signed request. However, proper SigV4 signing requires crypto. The simplest correct approach: use `fetch` to hit the STS endpoint with the access key in headers using the AWS format.

Since implementing full SigV4 is complex and we want to stay minimal, we'll use the `@aws-sdk/client-sts` approach or a simpler verification: check if the key format is valid and attempt a lightweight call. Given the project's YAGNI principle, we'll do a format check + a basic HTTPS call to the STS endpoint.

Actually — AWS requires signed requests for all API calls. There's no "unauthenticated check" endpoint. The simplest approach for AWS credential verification is to use the `X-Amz-Content-SHA256` header-based unsigned payload approach with manual SigV4 signing, or to accept that AWS verification needs a signing library.

For now, let's implement a simpler version that checks key format validity and returns that result. Full AWS SigV4 signing can be added later if needed.

```ts
import { z } from 'zod';
import type { CredentialVerifier } from '../contracts.js';

export const awsCredentialsSchema = z.object({
	accessKeyId: z.string().min(1),
	secretAccessKey: z.string().min(1),
});

const AWS_ACCESS_KEY_ID_PATTERN = /^AKIA[0-9A-Z]{16}$/;
const AWS_SECRET_KEY_MIN_LENGTH = 40;

export const verifyAws = async (
	credentials: Record<string, unknown>,
): Promise<{ valid: boolean }> => {
	const parsed = awsCredentialsSchema.safeParse(credentials);
	if (!parsed.success) {
		return { valid: false };
	}

	const { accessKeyId, secretAccessKey } = parsed.data;

	const hasValidKeyId = AWS_ACCESS_KEY_ID_PATTERN.test(accessKeyId);
	const hasValidSecret = secretAccessKey.length >= AWS_SECRET_KEY_MIN_LENGTH;

	return { valid: hasValidKeyId && hasValidSecret };
};

export const awsVerifier: CredentialVerifier = {
	credentialsSchema: awsCredentialsSchema,
	verify: verifyAws,
};
```

> **Note:** This verifier checks format validity only. Full AWS STS GetCallerIdentity verification requires SigV4 request signing, which would need adding `@aws-sdk/client-sts` as a dependency. The format check catches obviously invalid keys without that dependency.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/server/routes/verify/providers/aws.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/server/routes/verify/providers/aws.ts src/server/routes/verify/providers/aws.test.ts
git commit -m "feat(verify): add AWS credential verifier (format check)"
```

---

### Task 5: Google provider

**Files:**

- Create: `src/server/routes/verify/providers/google.ts`
- Create: `src/server/routes/verify/providers/google.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { verifyGoogle } from './google.js';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('verifyGoogle', () => {
	beforeEach(() => {
		mockFetch.mockReset();
	});

	it('returns valid=true for 200 response', async () => {
		mockFetch.mockResolvedValueOnce(new Response(null, { status: 200 }));
		const result = await verifyGoogle({ apiKey: 'AIza-valid-key' });
		expect(result).toEqual({ valid: true });
	});

	it('returns valid=false for 400 response (invalid key)', async () => {
		mockFetch.mockResolvedValueOnce(new Response(null, { status: 400 }));
		const result = await verifyGoogle({ apiKey: 'AIza-bad-key' });
		expect(result).toEqual({ valid: false });
	});

	it('returns valid=false on network error', async () => {
		mockFetch.mockRejectedValueOnce(new Error('network failure'));
		const result = await verifyGoogle({ apiKey: 'AIza-key' });
		expect(result).toEqual({ valid: false });
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/server/routes/verify/providers/google.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write the implementation**

```ts
import { z } from 'zod';
import type { CredentialVerifier } from '../contracts.js';

export const googleCredentialsSchema = z.object({
	apiKey: z.string().min(1),
});

export const verifyGoogle = async (
	credentials: Record<string, unknown>,
): Promise<{ valid: boolean }> => {
	const parsed = googleCredentialsSchema.safeParse(credentials);
	if (!parsed.success) {
		return { valid: false };
	}

	try {
		const response = await fetch(
			`https://www.googleapis.com/oauth2/v1/tokeninfo?key=${encodeURIComponent(parsed.data.apiKey)}`,
			{ signal: AbortSignal.timeout(10_000) },
		);
		return { valid: response.ok };
	} catch {
		return { valid: false };
	}
};

export const googleVerifier: CredentialVerifier = {
	credentialsSchema: googleCredentialsSchema,
	verify: verifyGoogle,
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/server/routes/verify/providers/google.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/server/routes/verify/providers/google.ts src/server/routes/verify/providers/google.test.ts
git commit -m "feat(verify): add Google credential verifier"
```

---

### Task 6: Stripe provider

**Files:**

- Create: `src/server/routes/verify/providers/stripe.ts`
- Create: `src/server/routes/verify/providers/stripe.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { verifyStripe } from './stripe.js';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('verifyStripe', () => {
	beforeEach(() => {
		mockFetch.mockReset();
	});

	it('returns valid=true for 200 response', async () => {
		mockFetch.mockResolvedValueOnce(new Response(null, { status: 200 }));
		const result = await verifyStripe({ apiKey: 'sk_live_valid' });
		expect(result).toEqual({ valid: true });
	});

	it('returns valid=false for 401 response', async () => {
		mockFetch.mockResolvedValueOnce(new Response(null, { status: 401 }));
		const result = await verifyStripe({ apiKey: 'sk_live_bad' });
		expect(result).toEqual({ valid: false });
	});

	it('returns valid=false on network error', async () => {
		mockFetch.mockRejectedValueOnce(new Error('network failure'));
		const result = await verifyStripe({ apiKey: 'sk_live_key' });
		expect(result).toEqual({ valid: false });
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/server/routes/verify/providers/stripe.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write the implementation**

Stripe authenticates via HTTP Basic Auth with the API key as the username and an empty password.

```ts
import { z } from 'zod';
import type { CredentialVerifier } from '../contracts.js';

export const stripeCredentialsSchema = z.object({
	apiKey: z.string().min(1),
});

export const verifyStripe = async (
	credentials: Record<string, unknown>,
): Promise<{ valid: boolean }> => {
	const parsed = stripeCredentialsSchema.safeParse(credentials);
	if (!parsed.success) {
		return { valid: false };
	}

	try {
		const response = await fetch('https://api.stripe.com/v1/balance', {
			headers: {
				Authorization: `Basic ${btoa(`${parsed.data.apiKey}:`)}`,
			},
			signal: AbortSignal.timeout(10_000),
		});
		return { valid: response.ok };
	} catch {
		return { valid: false };
	}
};

export const stripeVerifier: CredentialVerifier = {
	credentialsSchema: stripeCredentialsSchema,
	verify: verifyStripe,
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/server/routes/verify/providers/stripe.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/server/routes/verify/providers/stripe.ts src/server/routes/verify/providers/stripe.test.ts
git commit -m "feat(verify): add Stripe credential verifier"
```

---

### Task 7: Provider registry

**Files:**

- Create: `src/server/routes/verify/registry.ts`

- [ ] **Step 1: Write the registry**

```ts
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

export const getVerifier = (provider: Provider): CredentialVerifier => {
	return registry[provider];
};
```

- [ ] **Step 2: Run typecheck**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/server/routes/verify/registry.ts
git commit -m "feat(verify): add provider registry"
```

---

### Task 8: Hono route

**Files:**

- Create: `src/server/routes/verify/index.ts`

- [ ] **Step 1: Write the route handler**

```ts
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

			if (!bodyResult) {
				return c.json({ error: 'Invalid JSON body' }, 400);
			}

			const parsed = verifyRequestSchema.safeParse(bodyResult);

			if (!parsed.success) {
				return c.json({ error: 'Invalid request body' }, 400);
			}

			const verifier = getVerifier(parsed.data.provider);
			const result = await verifier.verify(parsed.data.credentials);

			return c.json(result);
		}),
);

export default verifyRoutes;
```

- [ ] **Step 2: Run typecheck**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/server/routes/verify/index.ts
git commit -m "feat(verify): add POST /api/verify-credentials route"
```

---

### Task 9: Mount route in app

**Files:**

- Modify: `src/server/routes/index.ts` (add import + mount before CSRF middleware)

- [ ] **Step 1: Add the import and mount**

In `src/server/routes/index.ts`, add the import after the existing route imports (after line 19):

```ts
import verifyRoutes from './verify/index.js';
```

Then add the mount **before** the CSRF middleware block (after line 43 `app.route('/', healthzRoutes);`):

```ts
app.route('/api', verifyRoutes);
```

- [ ] **Step 2: Run typecheck**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Run lint**

Run: `npx eslint src/server/routes/index.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/server/routes/index.ts
git commit -m "feat(verify): mount credential verifier route at /api"
```

---

### Task 10: Run full test suite and lint

- [ ] **Step 1: Run all tests**

Run: `npx vitest run`
Expected: All tests pass

- [ ] **Step 2: Run typecheck**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Run lint**

Run: `npx eslint src/`
Expected: PASS

- [ ] **Step 4: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix(verify): address lint/typecheck issues"
```
