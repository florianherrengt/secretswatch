import { z } from "zod";
import type { FC } from "hono/jsx";
import { Layout } from "../layout.js";

export const dedupeInputPagePropsSchema = z.object({
	defaultDomain: z.string().optional(),
	errorMessage: z.string().optional()
});

export type DedupeInputPageProps = z.infer<typeof dedupeInputPagePropsSchema>;

export const dedupeResultPagePropsSchema = z.object({
	domain: z.string().min(1),
	rawFindingsCount: z.number().int().min(0),
	afterInternalDedupeCount: z.number().int().min(0),
	newFindingsInsertedCount: z.number().int().min(0),
	skippedExistingCount: z.number().int().min(0)
});

export type DedupeResultPageProps = z.infer<typeof dedupeResultPagePropsSchema>;

export const DedupeInputPage: FC<DedupeInputPageProps> = z
	.function()
	.args(dedupeInputPagePropsSchema)
	.returns(z.custom<ReturnType<FC<DedupeInputPageProps>>>())
	.implement(({ defaultDomain, errorMessage }) => {
		return (
			<Layout title="Deduplication Debug">
				<section class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
					<h1 class="text-2xl font-semibold tracking-tight">Deduplication Debug</h1>
					<p class="mt-2 text-sm text-gray-600">
						Run a scan and inspect deduplication counts end-to-end.
					</p>

					{errorMessage ? (
						<p class="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
							{errorMessage}
						</p>
					) : null}

					<form action="/dedupe" method="post" class="mt-5 space-y-3">
						<label for="domain" class="block text-sm font-medium text-gray-700">
							Domain target
						</label>
						<input
							id="domain"
							name="domain"
							type="text"
							required
							value={defaultDomain ?? ""}
							placeholder="localhost:3000/sandbox/website/examples/pem-key/"
							class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
						/>
						<button
							type="submit"
							class="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white"
						>
							Run dedupe debug
						</button>
					</form>
				</section>
			</Layout>
		);
	});

export const DedupeResultPage: FC<DedupeResultPageProps> = z
	.function()
	.args(dedupeResultPagePropsSchema)
	.returns(z.custom<ReturnType<FC<DedupeResultPageProps>>>())
	.implement((props) => {
		return (
			<Layout title="Deduplication Result">
				<section class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
					<h1 class="text-2xl font-semibold tracking-tight">Deduplication Result</h1>
					<div class="mt-3 space-y-2 text-sm text-gray-700">
						<p>
							<strong>Domain:</strong> {props.domain}
						</p>
						<p>
							<strong>Raw findings:</strong> {props.rawFindingsCount}
						</p>
						<p>
							<strong>After internal dedupe:</strong> {props.afterInternalDedupeCount}
						</p>
						<p>
							<strong>New findings inserted:</strong> {props.newFindingsInsertedCount}
						</p>
						<p>
							<strong>Skipped (already known):</strong> {props.skippedExistingCount}
						</p>
					</div>

					{props.afterInternalDedupeCount > 0 && props.newFindingsInsertedCount === 0 ? (
						<p class="mt-4 rounded-md border border-yellow-200 bg-yellow-50 px-3 py-2 text-sm text-yellow-800">
							No new findings (already known)
						</p>
					) : null}

					<p class="mt-5 text-sm">
						<a href="/dedupe" class="underline">
							Run another dedupe check
						</a>
					</p>
				</section>
			</Layout>
		);
	});
