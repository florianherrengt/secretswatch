import 'dotenv/config';
import { z } from 'zod';
import { Hono } from 'hono';
import type { Context } from 'hono';
import { serve } from '@hono/node-server';
import indexRoutes from './routes/index.js';
import { startScanWorker } from './scan/scanWorker.js';
import { registerHourlyScheduler, startSchedulerWorker } from './scheduler/schedulerQueue.js';
import { runMigrations } from './db/migrate.js';

const app = new Hono();

app.route('/', indexRoutes);

app.onError(
	z
		.function()
		.args(z.instanceof(Error), z.custom<Context>())
		.returns(z.instanceof(Response))
		.implement((err, c) => {
			console.error('Unhandled error:', err);
			return c.html('<h1>500 Internal Server Error</h1>', 500);
		}),
);

app.notFound(
	z
		.function()
		.args(z.custom<Context>())
		.returns(z.instanceof(Response))
		.implement((c) => {
			return c.html('<h1>404 Not Found</h1>', 404);
		}),
);

const port = Number(process.env.PORT) || 3000;
const domain = z
	.string()
	.min(1)
	.parse(process.env.DOMAIN ?? `localhost:${port}`);

const boot = z
	.function()
	.args()
	.returns(z.promise(z.void()))
	.implement(async () => {
		await runMigrations();

		if (process.env.NODE_ENV !== 'test') {
			startScanWorker();
			startSchedulerWorker();
			void registerHourlyScheduler();
		}

		serve(
			{ fetch: app.fetch, port },
			z
				.function()
				.args()
				.returns(z.void())
				.implement(() => {
					console.log(`Server running on http://${domain}`);
				}),
		);
	});

void boot().catch(
	z
		.function()
		.args(z.instanceof(Error))
		.returns(z.never())
		.implement((error) => {
			console.error('Failed to start server:', error);
			process.exit(1);
		}),
);
