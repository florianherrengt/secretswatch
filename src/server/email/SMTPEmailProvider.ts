import { z } from 'zod';
import nodemailer from 'nodemailer';
import type { EmailProvider } from './EmailProvider.js';

const getFromEmail = z
	.function()
	.args()
	.returns(z.string())
	.implement(() => {
		const configuredFrom = process.env.SMTP_FROM?.trim();
		if (configuredFrom && configuredFrom.length > 0) {
			return configuredFrom;
		}

		const domain =
			process.env.DOMAIN_NAME || (process.env.DOMAIN || 'localhost:3000').split(':')[0];

		if (domain.includes('.')) {
			return `noreply@${domain}`;
		}

		return `noreply@localhost`;
	});

const createTransport = z
	.function()
	.args()
	.returns(z.custom<nodemailer.Transporter>())
	.implement(() => {
		const port = Number(process.env.SMTP_PORT) || 587;
		return nodemailer.createTransport({
			host: z.string().min(1).parse(process.env.SMTP_HOST?.trim()),
			port,
			secure: port === 465,
			auth: {
				user: z.string().min(1).parse(process.env.SMTP_USER?.trim()),
				pass: z.string().min(1).parse(process.env.SMTP_PASS?.trim()),
			},
		});
	});

// eslint-disable-next-line no-restricted-syntax
export class SMTPEmailProvider implements EmailProvider {
	send = z
		.function()
		.args(
			z.object({
				to: z.string(),
				subject: z.string(),
				html: z.string(),
			}),
		)
		.returns(z.promise(z.void()))
		.implement(async (input) => {
			const transporter = createTransport();

			await transporter.sendMail({
				from: getFromEmail(),
				to: input.to,
				subject: input.subject,
				html: input.html,
			});
		});
}
