import { ioredisClient } from './src/server/scan/redis.js';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { db } from './src/server/db/client.js';
import { sql } from 'drizzle-orm';

await (async () => {
	if (ioredisClient.status !== 'ready') {
		await new Promise<void>((resolve) => ioredisClient.once('ready', () => resolve()));
	}

	const tables = await db.execute(
		sql`SELECT tablename FROM pg_tables WHERE schemaname = 'public' LIMIT 1`,
	);
	if (tables.rows.length > 0) {
		return;
	}

	await db.execute(sql`SELECT pg_advisory_lock(1234567890)`);

	try {
		const tablesAfterLock = await db.execute(
			sql`SELECT tablename FROM pg_tables WHERE schemaname = 'public' LIMIT 1`,
		);
		if (tablesAfterLock.rows.length > 0) {
			return;
		}

		const migrationsFolder = resolve(dirname(fileURLToPath(import.meta.url)), 'drizzle');
		const journal = JSON.parse(
			readFileSync(resolve(migrationsFolder, 'meta/_journal.json'), 'utf-8'),
		);
		for (const entry of journal.entries) {
			const migrationSql = readFileSync(resolve(migrationsFolder, entry.tag + '.sql'), 'utf-8');
			await db.execute(sql.raw(migrationSql));
		}
	} finally {
		await db.execute(sql`SELECT pg_advisory_unlock(1234567890)`);
	}
})();
