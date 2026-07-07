# Credential Verifier API

## Overview

A standalone API endpoint that takes a provider name and credentials, checks if they are valid by making a lightweight authenticated request to the provider's API, and returns `{ valid: boolean }`.

## Endpoint

**`POST /api/verify-credentials`**

### Request

```json
{
	"provider": "openai",
	"credentials": { "apiKey": "sk-..." }
}
```

- `provider` — one of the supported provider enum values
- `credentials` — provider-specific object, validated by Zod

### Response

**Success (200):**

```json
{ "valid": true }
```

```json
{ "valid": false }
```

**Validation error (400):**

```json
{ "error": "Invalid request body" }
```

**Unknown provider (400):**

```json
{ "error": "Unknown provider: xyz" }
```

## File Structure

```
src/server/routes/verify/
  index.ts          # Hono sub-router, mounts POST handler
  contracts.ts      # Zod schemas for request/response, provider enum, verifier type
  registry.ts       # Maps provider name -> verifier function
  providers/
    openai.ts       # Verify OpenAI API key
    aws.ts          # Verify AWS access key
    github.ts       # Verify GitHub token
    google.ts       # Verify Google API key
    stripe.ts       # Verify Stripe API key
```

## Provider Contract

Each provider exports a `CredentialVerifier` object:

```ts
type CredentialVerifier<T> = {
	credentialsSchema: z.ZodType<T>;
	verify: z.ZodFunction<
		z.ZodTuple<[z.ZodType<T>]>,
		z.ZodPromise<z.ZodObject<{ valid: z.ZodBoolean }>>
	>;
};
```

- `credentialsSchema` — Zod schema for the provider-specific credentials
- `verify` — async function that takes validated credentials and returns `{ valid: boolean }`

Each provider makes one lightweight authenticated API call:

| Provider | Verification call                                    | Credentials shape                                  |
| -------- | ---------------------------------------------------- | -------------------------------------------------- |
| OpenAI   | `GET https://api.openai.com/v1/models`               | `{ apiKey: string }`                               |
| AWS      | STS GetCallerIdentity via `sts.amazonaws.com`        | `{ accessKeyId: string, secretAccessKey: string }` |
| GitHub   | `GET https://api.github.com/user`                    | `{ token: string }`                                |
| Google   | `GET https://www.googleapis.com/oauth2/v1/tokeninfo` | `{ apiKey: string }`                               |
| Stripe   | `GET https://api.stripe.com/v1/balance`              | `{ apiKey: string }`                               |

## Error Handling

- Network errors, timeouts, and unexpected responses return `{ valid: false }` — no exceptions propagate to the caller.
- Only malformed request bodies or unknown providers result in 400 errors.
- The route is mounted before CSRF middleware so it accepts programmatic API calls without CSRF tokens.

## Security

- The endpoint is open (no authentication required).
- It does not store or log credentials.
- Credentials are only held in memory for the duration of the verification request.

## Integration

The route is mounted in `src/server/routes/index.ts` before the CSRF middleware:

```ts
app.route('/api', verifyRoutes);
// ... then CSRF middleware, then other routes
```

## Testing

- Unit tests per provider using mocked fetch responses (valid key, invalid key, network error).
- Integration test for the endpoint via Hono's test request helper.
- All tests use vitest, following existing patterns.
