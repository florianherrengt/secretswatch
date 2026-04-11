import { z } from "zod";
import type { FC } from "hono/jsx";
import { ScanCard } from "../components/ScanCard.js";
import { Section } from "../components/Section.js";
import { StatusBadge } from "../components/StatusBadge.js";
import { Layout } from "../layout.js";

export const qualifyInputPagePropsSchema = z.object({
	defaultDomain: z.string().optional(),
	errorMessage: z.string().optional()
});

export type QualifyInputPageProps = z.infer<typeof qualifyInputPagePropsSchema>;

export const qualifyResultPagePropsSchema = z.object({
	domain: z.string().min(1),
	isQualified: z.boolean(),
	reasons: z.array(z.string().min(1)).min(1)
});

export type QualifyResultPageProps = z.infer<typeof qualifyResultPagePropsSchema>;

export const QualifyInputPage: FC<QualifyInputPageProps> = z
	.function()
	.args(qualifyInputPagePropsSchema)
	.returns(z.custom<ReturnType<FC<QualifyInputPageProps>>>())
	.implement(({ defaultDomain, errorMessage }) => {
		return (
			<Layout title="Qualification Debug">
				<div class="space-y-6">
					<h1 class="text-xl font-semibold text-foreground">Qualification Debug</h1>
					<Section title="Run Qualification" description="Run pipeline qualification on a domain and inspect the reason output.">
						<ScanCard>
							{errorMessage ? (
								<p class="rounded-md border border-error/25 bg-error/10 px-3 py-2 text-sm text-error">{errorMessage}</p>
							) : null}
							<form action="/qualify" method="get" class="space-y-3">
								<label for="domain" class="block text-sm font-medium text-foreground">
									Domain target
								</label>
								<input
									id="domain"
									name="domain"
									type="text"
									required
									value={defaultDomain ?? ""}
									placeholder="example.com"
									class="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
								/>
								<button
									type="submit"
									class="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
								>
									Run qualification
								</button>
							</form>
						</ScanCard>
					</Section>
				</div>
			</Layout>
		);
	});

export const QualifyResultPage: FC<QualifyResultPageProps> = z
	.function()
	.args(qualifyResultPagePropsSchema)
	.returns(z.custom<ReturnType<FC<QualifyResultPageProps>>>())
	.implement(({ domain, isQualified, reasons }) => {
		return (
			<Layout title="Qualification Result">
				<div class="space-y-6">
					<h1 class="text-xl font-semibold text-foreground">Qualification Result</h1>
					<Section title="Outcome">
						<ScanCard>
							<div class="flex items-center gap-3">
								<p class="text-sm font-medium text-foreground">{domain}</p>
								<StatusBadge status={isQualified ? "success" : "failed"} label={isQualified ? "qualified" : "not qualified"} />
							</div>
						</ScanCard>
					</Section>
					<Section title="Reasons">
						<ScanCard>
							<ul class="list-disc space-y-1 pl-6 text-sm text-muted-foreground">
								{reasons.map((reason) => {
									return <li key={reason}>{reason}</li>;
								})}
							</ul>
						</ScanCard>
					</Section>
					<p class="text-sm"><a href="/qualify" class="underline">Run another check</a></p>
				</div>
			</Layout>
		);
	});
