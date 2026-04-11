import { z } from "zod";
import type { FC } from "hono/jsx";
import { ScanCard } from "../components/ScanCard.js";
import { Section } from "../components/Section.js";
import { StatusBadge } from "../components/StatusBadge.js";
import { Layout } from "../layout.js";

export const scanResultItemSchema = z.object({
	file: z.string(),
	snippet: z.string()
});

export const scanResultCheckSchema = z.object({
	id: z.string(),
	name: z.string(),
	description: z.string(),
	status: z.enum(["passed", "failed"]),
	findings: z.array(scanResultItemSchema)
});

export const scanResultPagePropsSchema = z.object({
	domain: z.string(),
	status: z.enum(["pending", "success", "failed"]),
	startedAtIso: z.string(),
	finishedAtIso: z.string().nullable(),
	checks: z.array(scanResultCheckSchema)
});

export type ScanResultPageProps = z.infer<typeof scanResultPagePropsSchema>;

const formatDateTime = z
	.function()
	.args(z.string())
	.returns(z.string())
	.implement((isoValue) => {
		const parsedDate = new Date(isoValue);

		if (Number.isNaN(parsedDate.getTime())) {
			return isoValue;
		}

		return new Intl.DateTimeFormat("en-US", {
			year: "numeric",
			month: "short",
			day: "2-digit",
			hour: "2-digit",
			minute: "2-digit"
		}).format(parsedDate);
	});

const formatDuration = z
	.function()
	.args(z.string(), z.string().nullable())
	.returns(z.string())
	.implement((startedAtIso, finishedAtIso) => {
		if (!finishedAtIso) {
			return "In progress";
		}

		const startedAtMs = new Date(startedAtIso).getTime();
		const finishedAtMs = new Date(finishedAtIso).getTime();

		if (Number.isNaN(startedAtMs) || Number.isNaN(finishedAtMs) || finishedAtMs <= startedAtMs) {
			return "-";
		}

		const totalSeconds = Math.floor((finishedAtMs - startedAtMs) / 1000);
		const minutes = Math.floor(totalSeconds / 60);
		const seconds = totalSeconds % 60;

		if (minutes === 0) {
			return `${seconds}s`;
		}

		return `${minutes}m ${seconds}s`;
	});

export const ScanResultPage: FC<ScanResultPageProps> = z
	.function()
	.args(scanResultPagePropsSchema)
	.returns(z.custom<ReturnType<FC<ScanResultPageProps>>>())
	.implement((props) => {
		const isPending = props.status === "pending";
		const checksWithFindings = props.checks.filter((check) => check.findings.length > 0);
		const totalFindings = checksWithFindings.reduce((total, check) => total + check.findings.length, 0);
		const scanStatus =
			props.status === "pending" ? "running" : props.status === "failed" ? "failed" : "success";

		return (
			<Layout title="Scan Result" autoRefreshSeconds={isPending ? 1 : undefined}>
				<div class="space-y-6">
					<h1 class="text-xl font-semibold text-foreground">Scan Result</h1>

					<Section title="Scan Summary" description="Core status and timing metadata for this run.">
						<ScanCard>
							<div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
								<div class="space-y-2">
									<p class="text-sm font-medium text-foreground">{props.domain}</p>
									<StatusBadge status={scanStatus} />
								</div>
								<div class="space-y-1 text-sm text-muted-foreground sm:text-right">
									<p>
										<span class="font-medium text-foreground">Started:</span> {formatDateTime(props.startedAtIso)}
									</p>
									<p>
										<span class="font-medium text-foreground">Finished:</span>{" "}
										{props.finishedAtIso ? formatDateTime(props.finishedAtIso) : "-"}
									</p>
									<p>
										<span class="font-medium text-foreground">Duration:</span>{" "}
										{formatDuration(props.startedAtIso, props.finishedAtIso)}
									</p>
								</div>
							</div>
						</ScanCard>
					</Section>

					{!isPending ? (
						<Section title="Checks Overview" description="Quick scanability across all checks.">
							<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
								{props.checks.map((check) => {
									const hasFindings = check.findings.length > 0;

									return (
										<ScanCard
											key={check.id}
											title={check.name}
											head={<StatusBadge status={check.status === "failed" ? "failed" : "success"} />}
											class={hasFindings ? "border-error/30 bg-error/5" : undefined}
										>
											{hasFindings ? (
												<p class="text-sm font-medium text-error">{check.findings.length} findings</p>
											) : (
												<p class="text-sm text-muted-foreground">No issues found</p>
											)}
										</ScanCard>
									);
								})}
							</div>
						</Section>
					) : null}

					{!isPending ? (
						<Section
							title="Detailed Findings"
							description={
								totalFindings > 0
									? `${checksWithFindings.length} checks with findings`
									: "No findings reported"
							}
						>
							{checksWithFindings.length === 0 ? (
								<p class="text-sm text-muted-foreground">No issues found</p>
							) : (
								<div class="space-y-3">
									{checksWithFindings.map((check) => {
										return (
											<ScanCard
												key={`${check.id}-details`}
												title={check.name}
												head={
													<div class="flex items-center gap-2">
														<StatusBadge status="failed" />
														<span class="text-sm font-medium text-error">{check.findings.length}</span>
													</div>
												}
											>
												<ul class="divide-y divide-muted">
													{check.findings.map((finding) => {
														return (
															<li
																class="space-y-1 py-3 first:pt-0 last:pb-0"
																key={`${check.id}-${finding.file}-${finding.snippet}`}
															>
																<p class="text-sm font-medium text-foreground">{finding.file}</p>
																<p class="break-words text-sm text-muted-foreground">{finding.snippet}</p>
															</li>
														);
													})}
												</ul>
											</ScanCard>
										);
									})}
								</div>
							)}
						</Section>
					) : null}
				</div>
			</Layout>
		);
	});
