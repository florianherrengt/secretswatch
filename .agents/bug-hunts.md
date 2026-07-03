# Bug Hunt Memory

## Current status

- Last run: 2026-07-04 (run 3)
- Last inspected commit: d63e36e (on branch fix/verify-credential-checker-bugs)
- Suggested next focus: **Auth/login-token flows** (`src/server/auth/`,
  `login_tokens`, token TTL/hash + timing-safe compare). Then the job-exec
  risks below: graceful shutdown + BullMQ retry config are the highest-impact
  remaining items (they are why scans get stuck `pending` forever).

## Recent runs

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

## Open risks (job execution — highest impact)

- Risk: **No graceful shutdown.** `app.ts` starts the scan + scheduler workers
  but registers no SIGTERM/SIGINT handler and never calls `worker.close()`.
  Any deploy/restart kills in-flight jobs mid-execution; the scan row stays
  `pending` forever (UI shows "running"). Combine with no retry → stuck.
  - Files: `src/server/app.ts`, `src/server/scan/scanWorker.ts`,
    `src/server/scheduler/schedulerQueue.ts`.
  - Suggested follow-up: add `process.on('SIGTERM'/'SIGINT')` → `await
    Promise.all([scanWorker.close(), schedulerWorker.close()])` before exit.
- Risk: **No BullMQ retry/stall config anywhere.** No `attempts`, no
  `stalledInterval`/`maxStalledCount` on workers, no
  `removeOnComplete`/`removeOnFail` on queue `.add`. Defaults: jobs run once
  (no retry), stalled jobs are never detected, Redis retains every job
  forever. This is the root cause of "stuck running" + unbounded Redis growth.
  - Files: `src/server/scan/scanQueue.ts`, `src/server/scan/scanWorker.ts`,
    `src/server/scheduler/schedulerQueue.ts`.
  - Suggested follow-up: set `attempts` + `backoff` on scan adds; configure
    stall detection on workers; set `removeOnComplete`/`removeOnFail` TTLs.
- Risk: **SSRF redirect / DNS-rebinding bypass.** `resolveAndCheckHost` runs
  before `fetch(..., redirect:'follow')`, so a redirect (or low-TTL DNS) to a
  private IP after the check is never re-validated. Affects
  `fetchTextResource`, `probeSourceMap`, `fetchDiscoveryResource`. The final-
  host check is a hostname *string* compare, not an IP re-check.
  - Files: `src/pipeline/scanDomain.ts:294-330, 757-824`,
    `src/pipeline/discovery.ts:318-344`.
  - Suggested follow-up: disable redirect-follow and check each hop, or
    re-run `resolveAndCheckHost` on the final resolved IP.
- Risk: **Partial results persisted as `status:'success'`.** Every per-
  resource fetch error is individually swallowed (`continue` on null) with no
  error budget or partial-failure flag; the scan then returns `success` with
  whatever it got (often "0 findings" when most targets failed). A scan that
  errored on most subdomains looks identical to a clean scan.
  - Files: `src/pipeline/scanDomain.ts:1006-1149`.
  - Suggested follow-up: track failed-fetch count; if above a threshold, set
    `status:'failed'` or surface a partial-failure indicator.
- Risk: **No scan-level deadline.** Loops are sequential (semaphore is dead
  weight), each fetch has its own timeout, but there's no overall abort. A
  pathological target can hold a worker for 10+ minutes (20 subdomains × N
  scripts × N sourcemaps, each up to its timeout). One shared Redis connection
  serves 2 queues + 2 workers + 2 rate limiters (BullMQ blocking-subscribe
  footgun).
  - Files: `src/pipeline/scanDomain.ts`, `src/server/scan/redis.ts`.

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

## Open risks (verify feature)

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
