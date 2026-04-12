import { z } from "zod";
import type { FC } from "hono/jsx";
import { ScanCard } from "./ScanCard.js";

const skeletonListPropsSchema = z.object({
	rows: z.number().int().min(1).max(6).optional()
});

type SkeletonListProps = z.infer<typeof skeletonListPropsSchema>;

export const SkeletonList: FC<SkeletonListProps> = z
	.function()
	.args(skeletonListPropsSchema)
	.returns(z.custom<ReturnType<FC<SkeletonListProps>>>())
	.implement(({ rows }) => {
		const rowCount = rows ?? 3;

		return (
			<div class="space-y-3" aria-live="polite" aria-busy="true">
				{Array.from({ length: rowCount }, (_, index) => {
					return (
						<ScanCard key={`skeleton-row-${index}`}>
							<div class="space-y-2">
								<p class="text-sm font-medium text-foreground">Loading check result</p>
								<div class="rounded-md border border-border bg-muted p-3">
									<p class="text-sm text-muted-foreground">Preparing finding details...</p>
								</div>
							</div>
						</ScanCard>
					);
				})}
			</div>
		);
	});
