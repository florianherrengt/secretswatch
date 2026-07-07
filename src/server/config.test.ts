import { describe, expect, it } from 'vitest';
import { resolveDatabaseUrl, resolveRedisUrl } from './config.js';

describe('service URL port overrides', () => {
	it('uses PG_PORT as the database URL port when set', () => {
		expect(
			resolveDatabaseUrl(
				'postgresql://secrets_watch:secrets_watch@localhost:5432/secrets_watch',
				'5433',
			),
		).toBe('postgresql://secrets_watch:secrets_watch@localhost:5433/secrets_watch');
	});

	it('uses REDIS_PORT as the Redis URL port when set', () => {
		expect(resolveRedisUrl('redis://localhost:6379', '6380')).toBe('redis://localhost:6380');
	});

	it('leaves URL ports alone when the port override is unset', () => {
		expect(
			resolveDatabaseUrl(
				'postgresql://secrets_watch:secrets_watch@localhost:5432/secrets_watch',
				undefined,
			),
		).toBe('postgresql://secrets_watch:secrets_watch@localhost:5432/secrets_watch');
	});

	it('rejects invalid port overrides', () => {
		expect(() => resolveDatabaseUrl('postgresql://localhost/app', '70000')).toThrow(
			'PG_PORT must be an integer between 1 and 65535',
		);
	});
});
