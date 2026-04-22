// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { Context } from 'hono';

declare module 'hono' {
	interface ContextVariableMap {
		sessionId: string | null;
		sessionUser: {
			userId: string;
			email: string;
			stripeCustomerId: string | null;
		} | null;
		user: {
			userId: string;
			email: string;
			stripeCustomerId: string | null;
		};
		flash: string | null;
		csrfToken: string;
	}
}
