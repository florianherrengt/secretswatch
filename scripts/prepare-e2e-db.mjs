import { Pool } from 'pg';

const databaseUrl =
	process.env.DATABASE_URL ??
	'postgresql://secrets_watch:secrets_watch@localhost:5432/secrets_watch';

const pool = new Pool({ connectionString: databaseUrl });

const ensureMigrationsTableSql = `
CREATE TABLE IF NOT EXISTS "__drizzle_migrations" (
  id SERIAL PRIMARY KEY,
  hash text NOT NULL,
  created_at bigint
);
`;

const ensureDiscoveryMetadataSql = `
ALTER TABLE "scans"
ADD COLUMN IF NOT EXISTS "discovery_metadata" jsonb;
`;

try {
	await pool.query(ensureMigrationsTableSql);
	await pool.query(ensureDiscoveryMetadataSql);
} finally {
	await pool.end();
}
