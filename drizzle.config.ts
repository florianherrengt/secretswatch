import { defineConfig } from 'drizzle-kit';

const databaseUrl =
	process.env.DATABASE_URL ??
	'postgresql://secrets_watch:secrets_watch@localhost:5432/secrets_watch';

export default defineConfig({
	schema: './src/server/db/schema.ts',
	out: './drizzle',
	dialect: 'postgresql',
	dbCredentials: {
		url: databaseUrl,
	},
});
