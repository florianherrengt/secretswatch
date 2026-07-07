import { z } from 'zod';

const DEFAULT_APP_ORIGIN = 'http://localhost:3000';
const DEFAULT_DATABASE_URL =
	'postgresql://secrets_watch:secrets_watch@localhost:5432/secrets_watch';
const DEFAULT_REDIS_URL = 'redis://localhost:6379';

const parseUrl = z
	.function()
	.args(z.string(), z.string())
	.returns(z.instanceof(URL))
	.implement((value, envName) => {
		try {
			return new URL(z.string().min(1).parse(value));
		} catch {
			throw new Error(`${envName} must be a valid URL`);
		}
	});

const parsePort = z
	.function()
	.args(z.string(), z.string())
	.returns(z.string())
	.implement((value, envName) => {
		const normalized = value.trim();
		const port = Number.parseInt(normalized, 10);
		if (!/^\d+$/.test(normalized) || port < 1 || port > 65_535) {
			throw new Error(`${envName} must be an integer between 1 and 65535`);
		}
		return String(port);
	});

const resolveUrlWithPortOverride = z
	.function()
	.args(z.string(), z.string().optional(), z.string(), z.string())
	.returns(z.string())
	.implement((rawUrl, rawPort, urlEnvName, portEnvName) => {
		const url = parseUrl(rawUrl, urlEnvName);
		if (rawPort?.trim()) {
			url.port = parsePort(rawPort, portEnvName);
		}
		return url.toString();
	});

export const resolveDatabaseUrl = z
	.function()
	.args(z.string().optional(), z.string().optional())
	.returns(z.string())
	.implement((databaseUrl, pgPort) =>
		resolveUrlWithPortOverride(
			databaseUrl ?? DEFAULT_DATABASE_URL,
			pgPort,
			'DATABASE_URL',
			'PG_PORT',
		),
	);

export const getDatabaseUrl = z
	.function()
	.args()
	.returns(z.string())
	.implement(() => resolveDatabaseUrl(process.env.DATABASE_URL, process.env.PG_PORT));

export const resolveRedisUrl = z
	.function()
	.args(z.string().optional(), z.string().optional())
	.returns(z.string())
	.implement((redisUrl, redisPort) =>
		resolveUrlWithPortOverride(redisUrl ?? DEFAULT_REDIS_URL, redisPort, 'REDIS_URL', 'REDIS_PORT'),
	);

export const getRedisUrl = z
	.function()
	.args()
	.returns(z.string())
	.implement(() => resolveRedisUrl(process.env.REDIS_URL, process.env.REDIS_PORT));

export const getAppOrigin = z
	.function()
	.args()
	.returns(z.string())
	.implement(() => {
		const domain = process.env.DOMAIN?.trim();
		if (!domain) {
			return DEFAULT_APP_ORIGIN;
		}

		const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
		const normalizedDomain = domain.replace(/^https?:\/\//, '');

		try {
			return new URL(`${protocol}://${normalizedDomain}`).origin;
		} catch {
			return DEFAULT_APP_ORIGIN;
		}
	});

export const getAppBaseUrl = z
	.function()
	.args()
	.returns(z.string())
	.implement(() => {
		const domain = process.env.DOMAIN?.trim();
		const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
		return `${protocol}://${domain && domain.length > 0 ? domain : 'localhost:3000'}`;
	});

export const CLEAR_SESSION_COOKIE = 'session_id=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0';
