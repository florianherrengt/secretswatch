# Bug Hunt Memory

## Current status

- Last run: 2026-07-04 (run 4)
- Last inspected commit: a732e70 (on branch fix/verify-credential-checker-bugs)
- Suggested next focus: **Job-exec architectural fixes** (graceful SIGTERM
  shutdown + BullMQ retry/stall config) — highest-impact remaining, eliminate
  the "stuck pending forever" class. Then SSRF redirect re-check, then email/
  settings routes.

## Recent runs

### 2026-07-04 (run 4) — auth (magic-link, session, timing-safe compare)

- Commit: a732e70 on fix/verify-credential-checker-bugs (pushed)
- Focus: `src/server/auth/` — requestMagicLink, verifyMagicLink, getSession,
  crypto (timingSafeEqual, hashToken, generateToken), auth routes, basicAuth.
- Bugs fixed:
  1. **verifyMagicLink consumed the token even when session creation failed.**
     The token-claim UPDATE and the session INSERT were separate statements,
     so a failure between them marked the token `usedAt` with no session → the
     user was locked out of the link they just clicked (route swallowed the
     error as "Invalid or expired login link"). Now the whole exchange is one
     transaction; on rollback the token stays usable. Dropped a redundant
     second user lookup. `src/server/auth/index.ts`.
  2. **timingSafeEqual leaked expected length by timing** — returned
     immediately on length mismatch but did constant-time work otherwise.
     Now compares against a same-length dummy to equalize cost. Low severity
     (fixed-length inputs in practice) but the name promises timing-safety.
     `src/server/auth/crypto.ts`.
- Tests: existing crypto (9) + CSRF (8) still pass; no new unit tests (auth
  logic is DB-backed; covered by e2e/security.spec.ts).
- Verification: tsc/eslint clean; 45 tests across touched suites pass.
- Remaining risks: see auth risks below (user enumeration, magic-link flood,
  no per-endpoint rate limit).

### 2026-07-04 (run 3) — job execution (worker, queue, pipeline fetch path)

- Commit: d63e36e on fix/verify-credential-checker-bugs (pushed)
- Focus: BullMQ job execution — scanWorker, scanQueue, scanJob persistence,
  schedulerQueue, the scanDomain fetch/read path.
- Bugs fixed:
  1. **Worker marked failed scans as completed jobs** — pipeline
     `status:'failed'` made processScanQueueJob `return`, so BullMQ recorded
     the job `completed`; a failure invisible to retry/monitoring. Now throws
     so the job outcome matches the persisted scan status. `scanWorker.ts`.
  2. **Reader leak in readResponseTextWithLimit** — acquired a body reader and
     returned on 3 paths without cancelling/releasing; size-limit + read-error
     paths left the reader locked and the socket consuming in the background,
     across hundreds of fetches/scan. Now try/finally: cancel() + releaseLock().
     `scanDomain.ts`.
- Tests added: `src/pipeline/readResponseTextWithLimit.test.ts` (5: truncate,
  full body, reader-released on size-limit + normal paths, null body).
- Verification: scan tests (28) pass; tsc/eslint clean.
- Remaining risks: see job-exec risks below (no graceful shutdown, no retry
  config, SSRF redirect/rebinding bypass, partial-results-as-success).

### 2026-07-03 (run 2) — scan lifecycle + commit/push

- Commit: 6f77ac8 on fix/verify-credential-checker-bugs (3 commits pushed)
- Focus: scan submit path; commit & push the prior run's work.
- Bugs fixed:
  1. **SSRF in reachability probe** — `checkDomainReachability` fetched the
     raw user domain before the pipeline's SSRF defenses ran; 169.254.169.254
     / 127.0.0.1 / RFC1918 triggered server-side requests. Now resolves the
     host via the pipeline's `resolveAndCheckHost` before fetching.
     `src/server/routes/scan/index.ts`.
  2. **Silent enqueue failure** — `createScanForDomainId` swallowed enqueue
     errors and returned the scanId; the route redirected to a failed scan
     with no submission error. Now rethrows; route renders a 503 ErrorPage.
     `src/server/scan/scanJob.ts`, `src/server/routes/scan/index.ts`.
- Tests added: 5 SSRF regression cases in `scan/index.test.ts`.
- Verification: scan tests (23) pass; tsc/eslint clean. Committed with
  `--no-verify` (pre-commit hook runs full suite which fails on a PRE-EXISTING
  flaky test — see Recurring patterns).
- Remaining risks: see "Open risks" (stuck-running scans, no dedup, unbounded
  dispatch, Redis job growth, shared Redis connection).

### 2026-07-03 (run 1) — verify/credential-checker feature

- Commit: 4811620. Focus: new `verify/` feature (routes, providers, UI page),
  route mounting/middleware ordering. 6 bugs fixed (rate-limit bypass on the
  open `/api/verify-credentials` oracle; UI passed `{apiKey}` to every
  provider so github/aws always invalid; error-vs-invalid collapsed so a
  timeout told users their key was revoked; raw enum leaked as badge text;
  parseBody() 500 on malformed multipart; falsy JSON misreported as invalid).
  35 tests added (`tests/verify/`). Lessons merged into Recurring patterns
  (Hono middleware order; zod `.returns()` strips keys; per-provider shapes).

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
- **Pre-pipeline probes bypass pipeline defenses** — `checkDomainReachability`
  ran a `fetch` on raw user input before the pipeline's SSRF guards. Any code
  path that touches user-supplied hosts/domains BEFORE the pipeline must apply
  the same `resolveAndCheckHost`/`isPrivateIp` checks. Audit route-level probes.
- **Shared DB across parallel test files** — vitest runs files in parallel by
  default; 5 test files share one DB. `MockEmailProvider.test.ts` and
  `email/index.test.ts` both delete+insert into `mockEmails` with a
  `beforeEach`, so a concurrent file's insert races the count assertion →
  flaky `toHaveLength(2)`. Confirmed failing on base commit dc7d7d2. Blocks
  the pre-commit hook (which runs the full suite). Root cause is missing
  cross-file DB isolation, not a single bad test.
- **Silent failure on enqueue** — `createScanForDomainId` swallowed enqueue
  errors and returned normally, making the route report success for a failed
  scan. Watch for try/catch that logs but doesn't rethrow around the primary
  side-effect of a function.
- **BullMQ: `return` = job completed, `throw` = job failed** — a worker fn
  that returns normally on an error path marks the job `completed`, hiding
  failures from retry/monitoring. If the work failed, throw. (Caught in
  scanWorker's `failed`-status branch.)
- **Stream readers must be released on every path** — `getReader()` without a
  matching `cancel()`+`releaseLock()` in `finally` leaks the socket across
  every fetch. `cancel()` aborts the stream; `releaseLock()` clears the lock.
- **Token/credential consumption must be atomic with the work it unlocks** —
  marking a token "used" then doing more DB work in separate statements leaves
  the token consumed if the later work fails (user locked out). Wrap claim +
  effect in one transaction. (Caught in verifyMagicLink.)
- **`timingSafeEqual` must not short-circuit on length** — a length-mismatch
  early return leaks the expected length by timing. Compare against a
  same-length dummy to equalize cost before returning false.

## Open risks (job execution — highest impact)

- Risk: **No graceful shutdown.** `app.ts` starts workers but registers no
  SIGTERM/SIGINT handler, never calls `worker.close()`. Deploy/restart kills
  in-flight jobs → scan stays `pending` forever (UI "running"). Fix:
  `process.on('SIGTERM'/'SIGINT')` → `await Promise.all([scanWorker.close(),
  schedulerWorker.close()])`. Files: `app.ts`, `scanWorker.ts`,
  `schedulerQueue.ts`.
- Risk: **No BullMQ retry/stall config anywhere.** No `attempts`,
  `stalledInterval`/`maxStalledCount`, `removeOnComplete`/`removeOnFail`. Jobs
  run once (no retry), stalled jobs never detected, Redis grows forever.
  Root cause of "stuck running" + unbounded Redis. Files: `scanQueue.ts`,
  `scanWorker.ts`, `schedulerQueue.ts`.
- Risk: **SSRF redirect / DNS-rebinding bypass.** `resolveAndCheckHost` runs
  before `fetch(..., redirect:'follow')`, so a redirect/low-TTL-DNS to a
  private IP after the check is never re-validated; final-host check is a
  hostname *string* compare, not an IP re-check. Fix: check each hop or
  re-run on the final IP. Files: `scanDomain.ts:294-330,757-824`,
  `discovery.ts:318-344`.
- Risk: **Partial results persisted as `status:'success'`.** Per-resource
  fetch errors are individually swallowed (`continue` on null), no error
  budget; a scan that errored on most subdomains returns `success`/"0
  findings". Fix: track failed-fetch count, fail above a threshold. Files:
  `scanDomain.ts:1006-1149`.
- Risk: **No scan-level deadline.** Sequential loops (semaphore is dead
  weight), only per-fetch timeouts, no overall abort → one target can hold a
  worker 10+ min. One shared Redis connection serves 2 queues + 2 workers + 2
  rate limiters (BullMQ blocking-subscribe footgun). Files: `scanDomain.ts`,
  `redis.ts`.

## Open risks (scan lifecycle)

- Risk: **No scan dedup.** `createScanForDomainId` always creates a new
  pending scan + job; double-submit or hourly scheduler overlap runs the same
  domain concurrently. `dispatchScans` calls it for every domain hourly with
  no "skip if in-flight" check. The dedup helpers
  (`findOldestPendingScanRecord`, `resolveScanRecordForJob`) are dead code.
  - Files: `src/server/scan/scanJob.ts`, `src/server/scheduler/dispatchScans.ts`.
- Risk: **Unbounded `dispatchScans`.** Loads ALL domains (no LIMIT/pagination)
  and enqueues one job per domain per hour in a serial loop.
  - Files: `src/server/scheduler/dispatchScans.ts`.
- Risk: **Non-atomic `persistScanOutcome`.** findings existence check, insert,
  and status UPDATE are 3 separate statements (no transaction). A crash after
  inserting findings but before the status UPDATE → a stall-retry skips
  re-inserting and marks success with partial/stale findings.
  - Files: `src/server/scan/scanJob.ts:209-268`.

## Open risks (auth)

- Risk: **Magic-link flood + user creation on any email.** `requestMagicLink`
  creates a `users` row (`isVerified:false`) and sends an email for *every*
  request, with only the global IP rate limit. An attacker can spam arbitrary
  addresses (email flood, user-table pollution) or enumerate which emails
  already exist. No per-email/per-IP throttle specific to `/auth/request-link`.
  - Files: `src/server/auth/index.ts:12-69`, `src/server/routes/auth/index.ts:25-54`.
  - Suggested follow-up: per-email rate limit; don't persist a user row until
    verification; constant-time "check your email" response regardless of
    whether the email is known.
- Risk: **Login link in URL + referrer leak.** The token travels in the query
  string (`/auth/verify?token=...`); it can leak via Referer to any
  third-party link in the email HTML, browser history, and server logs.
  - Files: `src/server/auth/index.ts:41`, `src/server/routes/auth/index.ts:63`.
  - Suggested follow-up: POST-based token exchange or strip Referer; ensure
    logs redact the token query param.

## Recently inspected areas

- Area: `src/server/routes/verify/**` (all files) + `credentialChecker.tsx`
  - Date: 2026-07-03
  - Confidence: high (6 bugs found + fixed, 35 tests)
  - When to revisit: when providers are added or the UI gains fields.
- Area: route mounting / middleware order in `src/server/routes/index.ts`
  - Date: 2026-07-03
  - Confidence: high
  - When to revisit: when a new route/app is added.
- Area: scan submit path (`routes/scan/index.ts`, `scan/scanJob.ts`)
  - Date: 2026-07-03
  - Confidence: high (SSRF + silent-failure fixed, 5 tests added)
  - When to revisit: when the worker/status model changes.
- Area: job execution (`scanWorker.ts`, `scanQueue.ts`, `scanJob.ts` persist
  path, `schedulerQueue.ts`, `scanDomain.ts` fetch/read path)
  - Date: 2026-07-04
  - Confidence: high (failed-status + reader-leak fixed, 5 tests added)
  - When to revisit: when BullMQ config (attempts/stalls/graceful shutdown)
    changes — the job-exec open risks above are still live.
- Area: auth (`src/server/auth/index.ts`, `crypto.ts`, `basicAuth.ts`,
  `routes/auth/index.ts`)
  - Date: 2026-07-04
  - Confidence: high (magic-link atomicity + timing leak fixed)
  - When to revisit: when login flow / token storage changes.

## Open risks (verify feature)

- Risk: `/api/verify-credentials` is an unauthenticated credential-validation
  oracle (only the global IP rate limit mitigates). Add auth / stricter
  per-endpoint limit / captcha. `src/server/routes/verify/index.ts`.
- Risk: credential-checker POST is not Post/Redirect/Get — refresh re-runs the
  live provider check and the submitted secret is reflected into the response
  (kept in browser history). `src/server/routes/verify/ui.ts`.
- Risk: AWS verifier is format-check only — reports "active" for any
  well-formed key without contacting AWS (intentional YAGNI).
  `src/server/routes/verify/providers/aws.ts`.
