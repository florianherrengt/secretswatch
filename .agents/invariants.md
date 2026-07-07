# Product Invariants

Durable invariants the codebase must uphold. Bug hunts should check these.

## Routing & middleware (Hono)

- **Middleware ordering:** Hono does NOT apply middleware registered _after_ a
  `app.route()` mount to that route. Mount order is load-bearing.
  - `app.onError(...)` must be registered before any route that can throw.
  - Global middleware (`flash`, `sessionContext`, `csrfTokenInjection`, `csrf`,
    rate limiter) must be registered with `app.use('*', ...)` BEFORE any route
    that needs them is mounted.
  - Proof: a route mounted before `app.use(mw)` does not receive `mw`.
- **Rate limiting applies to all routes except `/healthz`** and when
  `RATE_LIMIT_DISABLED=true`. The `/api/verify-credentials` endpoint is open
  (no auth, JSON so csrf() ignores it) by design, but MUST still be throttled
  → it is mounted after the rate limiter.
- **CSRF:** the built-in `hono/csrf` only validates form-like content-types
  (`x-www-form-urlencoded`, `multipart/form-data`, `text/plain`). JSON is never
  checked. The app's own token-based CSRF (`csrfTokenInjection` /
  `validateCsrfToken`) is the real protection for form posts.

## Credential verifier (`src/server/routes/verify`)

- **Provider credential shapes differ:** openai/google/stripe = `{ apiKey }`,
  github = `{ token }`, aws = `{ accessKeyId, secretAccessKey }`. The single-
  field UI form maps its one secret into the right shape and does NOT offer
  AWS (which needs two fields).
- **`VerifyResponse` = `{ valid, reason? }`.** `reason: 'rejected'` = the
  provider confirmed the credential is bad (or it failed local validation).
  `reason: 'error'` = indeterminate (network/timeout). The public JSON API
  exposes ONLY `valid`; `reason` is internal diagnostics for the UI.
- **UI must distinguish error from invalid:** a network failure must show
  "Could not verify — try again", never "doesn't work (or has been revoked)".
- AWS verifier is format-check only (intentional YAGNI; full SigV4 was
  deferred). A well-formed key reports valid; a malformed one reports rejected.

## Test infra

- Root `vitest.config.ts` setup file (`vitest.setup.ts`) requires live
  Postgres + Redis — the full suite hangs without them.
- `vitest.verify.config.ts` deliberately omits `setupFiles` so the verify
  suite runs standalone. Verify tests must not import db/redis-backed modules.
- `getSessionContextUser` short-circuits on `c.get('sessionUser')` — inject
  `sessionUser: null` in tests to avoid DB/session access.

## Zod gotcha

- `z.function().returns(schema)` STRIPS unknown keys (Zod objects default to
  stripping). Adding a field to a function's return value REQUIRES updating the
  `.returns()` schema or the field is silently dropped. This caused a fix to be
  inert until the schema was updated.

## Parallel worktrees (`make parallel-*`, `scripts/parallel-env.mjs`)

- Worktrees live in **`.worktrees/<branch-slug>/`** (inside the repo, gitignored).
- Each worktree is fully isolated: deterministic slot `sha256(slug)%8+1`, unique
  app/pg/redis ports (`20000 + default + slot`), its own containers, db name
  `secrets_watch_<slot>`, and its own data dirs.
- **The repo-root `.env` is the template** for every worktree `.env`.
  `make parallel-create` copies it and overrides the isolation keys. The root
  `.env` must define `PG_PORT`/`REDIS_PORT`; app/runtime helpers treat those as
  port overrides for `DATABASE_URL`/`REDIS_URL` so stale URL ports cannot send
  the app to the wrong local container.
- `make parallel-create` backfills any missing isolation keys into the root
  `.env` (defaults matching `docker-compose.yml`).
- Requires the external `workmux` binary (tmux orchestration) on PATH.
- See `.opencode/skills/worktree-create/SKILL.md` for the full contract.
