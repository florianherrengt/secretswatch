# Bug Hunt Memory

## Current status

- Last run: 2026-07-03
- Last inspected commit: dc7d7d2 (working tree had untracked `verify/` feature)
- Suggested next focus: **Scan lifecycle** (`src/server/routes/scan/`,
  `src/pipeline/scanDomain*`) — heavy async + persistence, recently changed,
  not yet inspected this run. Then auth/login-token flows.

## Recent runs

### 2026-07-03 — verify/credential-checker feature (first run)

- Commit: dc7d7d2 + untracked verify feature
- Focus areas: new `verify/` credential-checker feature (routes, providers,
  UI page), route mounting/middleware ordering.
- Bugs fixed:
  1. **Rate-limit bypass** — `/api/verify-credentials` was mounted before the
     rate limiter (CSRF skip was intentional, but no throttle on an open
     credential-validation oracle). Moved mount after the rate limiter.
     `src/server/routes/index.ts`.
  2. **Credential-shape mismatch in UI** — `verify/ui.ts` passed `{ apiKey }`
     to every verifier; github expects `{ token }`, aws expects
     `{ accessKeyId, secretAccessKey }` → both always reported invalid. Now
     maps per provider; AWS dropped from the single-field UI (kept in JSON API).
  3. **Error vs invalid collapsed** — all failures returned `{ valid: false }`,
     so a timeout told users their valid key was revoked; the spec-defined
     "Could not verify" error badge was unreachable. Added `reason` to
     `VerifyResponse`; UI maps `error` reason to the error badge. NOTE: had to
     update each provider's `.returns()` zod schema — zod strips unknown keys
     (see invariants).
  4. **Raw enum shown in badge** — badge rendered the literal `valid`/`invalid`
     /`error` token. Replaced with human labels (Active/Not working/Unknown).
  5. **parseBody() could throw → 500** on malformed multipart. Guarded with
     `.catch(() => null)`.
  6. **Falsy JSON misreported** — `if (!bodyResult)` treated valid `false`/`0`/
     `""` JSON as "Invalid JSON body". Changed to `=== null` sentinel check.
- Tests added: `tests/verify/{api,ui,route-mounting}.test.ts` + rewrote all 5
  provider tests for the new `reason` contract. 35 tests, all pass.
- Verification: `npx vitest run --config vitest.verify.config.ts` (35 pass),
  `tsc --noEmit` (0), `eslint` on changed files (0), design-system (0).
  Note: full root suite needs Postgres+Redis (not run).
- Remaining risks: see "Open risks".

## Recurring patterns

- **Hono middleware order is load-bearing** — mounting a route before global
  middleware silently skips that middleware. Always check mount vs `app.use`
  order when adding routes. (Caught again here.)
- **Zod `z.function().returns()` strips unknown keys** — adding return fields
  without updating the schema makes fixes silently inert. Always update both.
- **Single-field form vs multi-field credential shapes** — UI assumed one
  shape for all providers. Verify per-provider shapes when adding providers.
- **Tests encoding buggy behavior** — provider tests asserted
  `toEqual({ valid: false })` with no `reason`, masking the error/invalid
  collapse. When enriching a return contract, update tests to assert the new
  field explicitly.
- **Error-message accuracy** — falsy-but-valid values mislabeled by truthy
  checks (`if (!x)`). Use explicit sentinel comparison for catch defaults.
- **Port desync between URL and `*_PORT` var** — `.env` hardcoded the port
  inside `DATABASE_URL`/`REDIS_URL` while docker-compose read `PG_PORT`/
  `REDIS_PORT`. Changing one without the other makes the app hit the wrong
  DB. The root `.env` is the template for every worktree `.env`; both must
  stay in sync. `vitest.setup.ts` now loads dotenv so tests read `.env`
  (previously they fell back to the hardcoded `localhost:5432` default).
- **System Postgres hijacking 5432** — a login-started `postgresql@16`
  (brew) was occupying `localhost:5432`, so the Docker container bound to
  5433 and the app silently talked to the wrong DB (no `secrets_watch`
  role). Project rule: Postgres is Docker-only, never brew. If `role
secrets_watch does not exist` appears, check `lsof -i :5432` for a non-
  Docker process first.

## Recently inspected areas

- Area: `src/server/routes/verify/**` (all files) + `credentialChecker.tsx`
  - Date: 2026-07-03
  - Confidence: high (6 bugs found + fixed, 35 tests)
  - When to revisit: when providers are added or the UI gains fields.
- Area: route mounting / middleware order in `src/server/routes/index.ts`
  - Date: 2026-07-03
  - Confidence: high
  - When to revisit: when a new route/app is added.

## Open risks

- Risk: `/api/verify-credentials` is an unauthenticated credential-validation
  oracle. Rate limiting is the mitigation, but there is no auth and no
  per-credential throttling. A determined attacker within the IP rate limit
  can still validate leaked credential lists.
  - Files/flows: `src/server/routes/verify/index.ts`
  - Why it matters: abuse / egress attribution to this server.
  - Suggested follow-up: consider adding auth, a stricter per-IP limit for this
    endpoint, or a proof-of-work / captcha for the UI form.
- Risk: credential-checker POST is not Post/Redirect/Get. Refresh re-runs the
  live provider check (duplicate submission) and the submitted secret is kept
  in browser history via the re-rendered response.
  - Files/flows: `src/server/routes/verify/ui.ts`, `credentialChecker.tsx`
  - Why it matters: secret hygiene + duplicate outbound calls.
  - Suggested follow-up: PRG with flash-stored result state; do NOT reflect the
    secret back (current design intentionally echoes it for "tweak & retry").
- Risk: AWS verifier is format-check only — reports "active" for any
  well-formed key without contacting AWS. May mislead users.
  - Files/flows: `src/server/routes/verify/providers/aws.ts`
  - Suggested follow-up: documented as intentional (YAGNI); revisit if real
    AWS validation is needed (requires SigV4 / `@aws-sdk/client-sts`).
- Risk: `home.tsx` + `layout.tsx` were mid-refactor in the working tree
  (Layout extraction) — not deeply audited this run.
  - Suggested follow-up: verify the home page renders correctly post-refactor
    and no `<html>/<head>/<body>` duplication now that it uses `<Layout>`.
