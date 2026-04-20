import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { db } from './client.js';

const currentFilePath = fileURLToPath(import.meta.url);
const migrationsFolder = resolve(dirname(currentFilePath), '../../../drizzle');

export const runMigrations = z
	.function()
	.args()
	.returns(z.promise(z.void()))
	.implement(async () => {
		await migrate(db, { migrationsFolder });
	});
