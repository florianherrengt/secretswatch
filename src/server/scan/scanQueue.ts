import { Queue } from "bullmq";
import { z } from "zod";
import { scanQueueJobDataSchema, type ScanQueueJobData } from "./scanJob.js";

const REDIS_URL_FALLBACK = "redis://localhost:6379";
const redisUrlSchema = z.string().url();

const redisConnectionOptionsSchema = z.object({
	host: z.string().min(1),
	port: z.number().int().positive(),
	username: z.string().min(1).optional(),
	password: z.string().min(1).optional(),
	db: z.number().int().nonnegative()
});

const toRedisConnectionOptions = z
	.function()
	.args(z.string().url())
	.returns(redisConnectionOptionsSchema)
	.implement((redisUrl) => {
		const parsedUrl = new URL(redisUrl);
		const dbValue = parsedUrl.pathname.replace(/^\//, "").trim();
		const parsedDb = dbValue.length === 0 ? 0 : Number(dbValue);

		return redisConnectionOptionsSchema.parse({
			host: parsedUrl.hostname,
			port: Number(parsedUrl.port || 6379),
			username: parsedUrl.username.length > 0 ? decodeURIComponent(parsedUrl.username) : undefined,
			password: parsedUrl.password.length > 0 ? decodeURIComponent(parsedUrl.password) : undefined,
			db: parsedDb
		});
	});

export const redisConnection = toRedisConnectionOptions(
	redisUrlSchema.parse(process.env.REDIS_URL ?? REDIS_URL_FALLBACK)
);

export const scanQueueName = "scanQueue";
export const scanQueue = new Queue<ScanQueueJobData>(scanQueueName, {
	connection: redisConnection
});

export const enqueueScanJob = z
	.function()
	.args(z.string().uuid(), scanQueueJobDataSchema)
	.returns(z.promise(z.void()))
	.implement(async (scanId, jobData) => {
		const payload = scanQueueJobDataSchema.parse(jobData);

		await scanQueue.add("scanDomain", payload, {
			jobId: scanId
		});
	});
