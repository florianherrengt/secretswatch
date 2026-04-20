import { z } from 'zod';
import { MockEmailProvider } from './MockEmailProvider.js';
import { SMTPEmailProvider } from './SMTPEmailProvider.js';
import type { EmailProvider } from './EmailProvider.js';

const hasSmtpConfig = z
	.function()
	.args()
	.returns(z.boolean())
	.implement(() => {
		return (
			typeof process.env.SMTP_HOST === 'string' &&
			process.env.SMTP_HOST.trim().length > 0 &&
			typeof process.env.SMTP_USER === 'string' &&
			process.env.SMTP_USER.trim().length > 0 &&
			typeof process.env.SMTP_PASS === 'string' &&
			process.env.SMTP_PASS.trim().length > 0
		);
	});

const createEmailProvider = z
	.function()
	.args()
	.returns(z.custom<EmailProvider>())
	.implement(() => {
		if (hasSmtpConfig()) {
			return new SMTPEmailProvider();
		}

		if (process.env.NODE_ENV === 'production') {
			throw new Error(
				'SMTP credentials (SMTP_HOST, SMTP_USER, SMTP_PASS) are required in production',
			);
		}

		return new MockEmailProvider();
	});

export const getEmailProvider = z
	.function()
	.args()
	.returns(z.custom<EmailProvider>())
	.implement(() => {
		return createEmailProvider();
	});
