import { z } from 'zod';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

const DATABASE_URL_FALLBACK =
	'postgresql://secret_detector:secret_detector@localhost:5432/secret_detector';
const databaseUrlSchema = z.string().min(1);

export const db = drizzle(
	new Pool({
		connectionString: databaseUrlSchema.parse(process.env.DATABASE_URL ?? DATABASE_URL_FALLBACK),
	}),
);
