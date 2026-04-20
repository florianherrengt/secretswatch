# E2E Test Guide

## Authenticated tests

Use the shared auth fixtures from `tests/e2e/fixtures/authed.ts`.

This logs in via the magic-link flow and gives you a ready-to-use session, so each test can focus on its feature.

### Fixtures

- `authSession`: `{ email, sessionId, cookieHeader }`
- `authHeaders`: `{ Cookie: "session_id=..." }` for authenticated API requests
- `authedPage`: `page` with an authenticated session cookie already set

### Example

```ts
import { expect, test } from './fixtures/authed';

test('authenticated endpoint', async ({ request, authHeaders }) => {
	const response = await request.get('/admin/queues', { headers: authHeaders });
	expect(response.status()).toBe(200);
});

test('authenticated UI page', async ({ authedPage }) => {
	await authedPage.goto('/');
	await expect(authedPage.getByRole('button', { name: 'Run scan' })).toBeVisible();
});
```

### Notes

- The fixture helper uses `/debug/emails`, so e2e runs with `DEBUG_ENDPOINT=true` in `playwright.config.ts`.
- Prefer importing from `./fixtures/authed` for tests that need auth.
- If a test is explicitly about auth behavior itself, call the lower-level helper in `tests/e2e/support/auth.ts` directly.

### Auth helper API (`tests/e2e/support/auth.ts`)

- `createAuthenticatedSession(request, email?)` -> full login flow, returns `{ email, sessionId, cookieHeader }`
- `requestMagicLink(request, email)` -> calls `/auth/request-link`
- `getTokenForEmail(request, email)` -> polls mock inbox and extracts token
- `verifyMagicLinkToken(request, tokenOrMagicLink)` -> calls `/auth/verify` with no redirects

Use these helpers for auth-focused/security tests so new tests do not reimplement token/session plumbing.

### Multiple users in one test

```ts
import { expect, test } from '@playwright/test';
import { createAuthenticatedSession } from './support/auth';

test('session isolation', async ({ request }) => {
	const userA = await createAuthenticatedSession(request, `user-a-${Date.now()}@example.com`);
	await createAuthenticatedSession(request, `user-b-${Date.now()}@example.com`);

	const response = await request.get('/auth/whoami', {
		headers: { Cookie: userA.cookieHeader },
	});

	const body = await response.json();
	expect(body.email).toBe(userA.email);
});
```
