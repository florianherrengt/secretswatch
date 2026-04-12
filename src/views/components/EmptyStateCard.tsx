import { z } from "zod";
import type { FC } from "hono/jsx";
import { ScanCard } from "./ScanCard.js";

const emptyStateCardPropsSchema = z.object({
	title: z.string().min(1),
	description: z.string().min(1),
	actionHint: z.string().min(1).optional()
});

type EmptyStateCardProps = z.infer<typeof emptyStateCardPropsSchema>;

export const EmptyStateCard: FC<EmptyStateCardProps> = z
	.function()
	.args(emptyStateCardPropsSchema)
	.returns(z.custom<ReturnType<FC<EmptyStateCardProps>>>())
	.implement(({ title, description, actionHint }) => {
		return (
			<ScanCard>
				<div class="space-y-2">
					<p class="text-sm font-medium text-foreground">{title}</p>
					<p class="text-sm text-muted-foreground">{description}</p>
					{actionHint ? <p class="text-sm text-foreground">{actionHint}</p> : null}
				</div>
			</ScanCard>
		);
	});
