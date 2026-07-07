import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';
import { getDatabaseUrl } from './src/server/config.js';

export default defineConfig({
	schema: './src/server/db/schema.ts',
	out: './drizzle',
	dialect: 'postgresql',
	dbCredentials: {
		url: getDatabaseUrl(),
	},
});
