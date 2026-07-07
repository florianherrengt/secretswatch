import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { z } from 'zod';
import { getDatabaseUrl } from '../config.js';

const pool = new Pool({
	connectionString: getDatabaseUrl(),
});

export const db = drizzle(pool);

export const closeDb = z
	.function()
	.args()
	.returns(z.promise(z.void()))
	.implement(async () => {
		await pool.end();
	});
