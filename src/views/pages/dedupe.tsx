import { z } from "zod";
import type { FC } from "hono/jsx";
import { ScanCard } from "../components/ScanCard.js";
import { Section } from "../components/Section.js";
import { StatusBadge } from "../components/StatusBadge.js";
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
				<div class="space-y-6">
					<h1 class="text-xl font-semibold text-foreground">Deduplication Debug</h1>
					<Section title="Run Debug" description="Run a scan and inspect deduplication counts end-to-end.">
						<ScanCard>
							{errorMessage ? (
								<p class="rounded-md border border-error/25 bg-error/10 px-3 py-2 text-sm text-error">{errorMessage}</p>
							) : null}
							<form action="/dedupe" method="post" class="space-y-3">
								<label for="domain" class="block text-sm font-medium text-foreground">
									Domain target
								</label>
								<input
									id="domain"
									name="domain"
									type="text"
									required
									value={defaultDomain ?? ""}
									placeholder="localhost:3000/sandbox/website/examples/pem-key/"
									class="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
								/>
								<button
									type="submit"
									class="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
								>
									Run dedupe debug
								</button>
							</form>
						</ScanCard>
					</Section>
				</div>
			</Layout>
		);
	});

export const DedupeResultPage: FC<DedupeResultPageProps> = z
	.function()
	.args(dedupeResultPagePropsSchema)
	.returns(z.custom<ReturnType<FC<DedupeResultPageProps>>>())
	.implement((props) => {
		const noNewFindings = props.afterInternalDedupeCount > 0 && props.newFindingsInsertedCount === 0;

		return (
			<Layout title="Deduplication Result">
				<div class="space-y-6">
					<h1 class="text-xl font-semibold text-foreground">Deduplication Result</h1>
					<Section title="Summary">
						<ScanCard>
							<div class="space-y-2 text-sm">
								<p><span class="font-medium text-foreground">Domain:</span> <span class="text-muted-foreground">{props.domain}</span></p>
								<p><span class="font-medium text-foreground">Raw findings:</span> <span class="text-muted-foreground">{props.rawFindingsCount}</span></p>
								<p><span class="font-medium text-foreground">After internal dedupe:</span> <span class="text-muted-foreground">{props.afterInternalDedupeCount}</span></p>
								<p><span class="font-medium text-foreground">New findings inserted:</span> <span class="text-muted-foreground">{props.newFindingsInsertedCount}</span></p>
								<p><span class="font-medium text-foreground">Skipped already known:</span> <span class="text-muted-foreground">{props.skippedExistingCount}</span></p>
							</div>
							{noNewFindings ? (
								<div class="pt-1">
									<StatusBadge status="idle" label="No new findings" />
								</div>
							) : null}
						</ScanCard>
					</Section>
					<p class="text-sm"><a href="/dedupe" class="underline">Run another dedupe check</a></p>
				</div>
			</Layout>
		);
	});
