import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		include: ['tests/verify/**/*.test.ts'],
		exclude: ['dist/**', 'node_modules/**'],
	},
});
