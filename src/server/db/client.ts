import { z } from 'zod';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

const DATABASE_URL_FALLBACK =
	'postgresql://secrets_watch:secrets_watch@localhost:5432/secrets_watch';
const databaseUrlSchema = z.string().min(1);

export const db = drizzle(
	new Pool({
		connectionString: databaseUrlSchema.parse(process.env.DATABASE_URL ?? DATABASE_URL_FALLBACK),
	}),
);
