import { z } from 'zod';
import type { FC, PropsWithChildren } from 'hono/jsx';

type ScanCardProps = PropsWithChildren<{
	title?: string;
	description?: string;
	head?: ReturnType<FC>;
	class?: string;
}>;

const scanCardPropsSchema = z.custom<ScanCardProps>();

export const ScanCard: FC<ScanCardProps> = z
	.function()
	.args(scanCardPropsSchema)
	.returns(z.custom<ReturnType<FC<ScanCardProps>>>())
	.implement(({ title, description, head, class: classValue, children }) => {
		const hasHeader = Boolean(title) || Boolean(description) || Boolean(head);
		const classes = [
			'rounded-lg border border-border bg-card p-4 transition-colors hover:bg-muted/35 md:p-5',
			classValue ?? '',
		]
			.join(' ')
			.trim();

		return (
			<article class={classes}>
				{hasHeader ? (
					<header class="mb-3 flex items-start justify-between gap-3 border-b border-muted pb-3">
						<div class="space-y-1">
							{title ? <h3 class="text-sm font-medium text-foreground">{title}</h3> : null}
							{description ? <p class="text-sm text-muted-foreground">{description}</p> : null}
						</div>
						{head ? <div>{head}</div> : null}
					</header>
				) : null}
				<div class="space-y-3">{children}</div>
			</article>
		);
	});
