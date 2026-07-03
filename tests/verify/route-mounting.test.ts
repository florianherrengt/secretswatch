import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Regression guard for a middleware-ordering bug: the open
// /api/verify-credentials endpoint was originally mounted BEFORE the global
// rate limiter, which made it an unthrottled credential-validation oracle
// (CSRF is intentionally skipped for this JSON endpoint per the design spec,
// but rate limiting must still apply). Hono does not apply middleware
// registered *after* a route mount to that route, so mount order matters.
//
// The full app needs Redis/Postgres, so we assert the invariant structurally
// against the route-registration source. This keeps the guard runnable in the
// lightweight vitest.verify config.
const routesSource = readFileSync(resolve(process.cwd(), 'src/server/routes/index.ts'), 'utf8');

describe('verify API route mounting order', () => {
	it('mounts verifyRoutes AFTER the rate-limiter middleware', () => {
		const verifyApiMountIdx = routesSource.indexOf("app.route('/api', verifyRoutes)");
		const rateLimiterUseIdx = routesSource.indexOf('endpointRateLimiter.consume');

		expect(rateLimiterUseIdx).toBeGreaterThan(-1);
		expect(verifyApiMountIdx).toBeGreaterThan(-1);
		// The mount must appear after the rate limiter consumes a point.
		expect(verifyApiMountIdx).toBeGreaterThan(rateLimiterUseIdx);
	});

	it('does not mount verifyRoutes before the onError handler', () => {
		// A previous broken version placed the mount immediately after healthz,
		// before onError and all global middleware.
		const onErrorIdx = routesSource.indexOf('app.onError(');
		const verifyApiMountIdx = routesSource.indexOf("app.route('/api', verifyRoutes)");

		expect(onErrorIdx).toBeGreaterThan(-1);
		expect(verifyApiMountIdx).toBeGreaterThan(onErrorIdx);
	});
});
