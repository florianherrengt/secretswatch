import { randomUUID } from 'node:crypto';
import { afterEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { createMagicLoginLink, verifyMagicLink } from './index.js';
import { db } from '../db/client.js';
import { users } from '../db/schema.js';

describe('createMagicLoginLink', () => {
	const email = `dev-login-${randomUUID()}@example.com`;

	afterEach(async () => {
		await db.delete(users).where(eq(users.email, email));
	});

	it('generates a login URL that verifies the test user', async () => {
		const link = await createMagicLoginLink(email);
		const url = new URL(link.loginUrl);
		const token = url.searchParams.get('token');

		expect(link.email).toBe(email);
		expect(url.pathname).toBe('/auth/verify');
		expect(token).toBeTruthy();

		const session = await verifyMagicLink(token!);
		const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

		expect(session.userId).toBe(user?.id);
		expect(user?.isVerified).toBe(true);
	});
});
