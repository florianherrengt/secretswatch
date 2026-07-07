import 'dotenv/config';
import { spawn } from 'node:child_process';
import { parseArgs } from 'node:util';
import { z } from 'zod';
import { createMagicLoginLink } from '../server/auth/index.js';
import { closeDb } from '../server/db/client.js';

const DEFAULT_DEV_EMAIL = 'test@example.com';

const cliOptionsSchema = z.object({
	email: z.string().email().default(DEFAULT_DEV_EMAIL),
	open: z.boolean().default(false),
	help: z.boolean().default(false),
});

const printUsage = z
	.function()
	.args()
	.returns(z.void())
	.implement(() => {
		console.log(`Usage: npm run dev:login-link [-- --email test@example.com] [-- --open]

Generates a one-time development magic login link.

Options:
  --email, -e   Email to create/login as. Defaults to ${DEFAULT_DEV_EMAIL}
  --open, -o    Open the generated link in the default browser
  --help, -h    Show this help message`);
	});

const openInBrowser = z
	.function()
	.args(z.string())
	.returns(z.void())
	.implement((url) => {
		const command =
			process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'cmd' : 'xdg-open';
		const args = process.platform === 'win32' ? ['/c', 'start', '', url] : [url];
		const child = spawn(command, args, { detached: true, stdio: 'ignore' });
		child.unref();
	});

const parseCliOptions = z
	.function()
	.args(z.array(z.string()))
	.returns(cliOptionsSchema)
	.implement((args) => {
		const parsed = parseArgs({
			args,
			allowPositionals: false,
			options: {
				email: { type: 'string', short: 'e' },
				open: { type: 'boolean', short: 'o' },
				help: { type: 'boolean', short: 'h' },
			},
		});

		return cliOptionsSchema.parse(parsed.values);
	});

const main = z
	.function()
	.args()
	.returns(z.promise(z.void()))
	.implement(async () => {
		const options = parseCliOptions(process.argv.slice(2));

		if (options.help) {
			printUsage();
			return;
		}

		if (process.env.NODE_ENV === 'production') {
			throw new Error('dev:login-link is disabled when NODE_ENV=production');
		}

		const link = await createMagicLoginLink(options.email);

		console.log(`Dev login link for ${link.email}:`);
		console.log(link.loginUrl);
		console.log('');
		console.log('Open it while the dev server is running. The link expires in 15 minutes.');

		if (options.open) {
			openInBrowser(link.loginUrl);
			console.log('Opened in your default browser.');
		}
	});

void main()
	.catch(
		z
			.function()
			.args(z.instanceof(Error))
			.returns(z.promise(z.void()))
			.implement(async (error) => {
				console.error(error.message);
				process.exitCode = 1;
			}),
	)
	.finally(
		z
			.function()
			.args()
			.returns(z.promise(z.void()))
			.implement(async () => {
				await closeDb();
			}),
	);
