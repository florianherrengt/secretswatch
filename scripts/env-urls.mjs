const DEFAULT_DATABASE_URL =
	'postgresql://secrets_watch:secrets_watch@localhost:5432/secrets_watch';
const DEFAULT_REDIS_URL = 'redis://localhost:6379';

function parseUrl(value, envName) {
	try {
		return new URL(value);
	} catch {
		throw new Error(`${envName} must be a valid URL`);
	}
}

function parsePort(value, envName) {
	const normalized = value.trim();
	const port = Number.parseInt(normalized, 10);
	if (!/^\d+$/.test(normalized) || port < 1 || port > 65_535) {
		throw new Error(`${envName} must be an integer between 1 and 65535`);
	}
	return String(port);
}

export function resolveUrlWithPortOverride(rawUrl, rawPort, urlEnvName, portEnvName) {
	const url = parseUrl(rawUrl, urlEnvName);
	if (rawPort?.trim()) {
		url.port = parsePort(rawPort, portEnvName);
	}
	return url.toString();
}

export function getDatabaseUrl(env = process.env) {
	return resolveUrlWithPortOverride(
		env.DATABASE_URL ?? DEFAULT_DATABASE_URL,
		env.PG_PORT,
		'DATABASE_URL',
		'PG_PORT',
	);
}

export function getRedisUrl(env = process.env) {
	return resolveUrlWithPortOverride(
		env.REDIS_URL ?? DEFAULT_REDIS_URL,
		env.REDIS_PORT,
		'REDIS_URL',
		'REDIS_PORT',
	);
}
