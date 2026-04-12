import { z } from "zod";
import type { FC, PropsWithChildren } from "hono/jsx";

type PageHeaderProps = PropsWithChildren<{
	title: string;
	description?: string;
	action?: ReturnType<FC>;
}>;

const pageHeaderPropsSchema = z.custom<PageHeaderProps>();

export const PageHeader: FC<PageHeaderProps> = z
	.function()
	.args(pageHeaderPropsSchema)
	.returns(z.custom<ReturnType<FC<PageHeaderProps>>>())
	.implement(({ title, description, action, children }) => {
		return (
			<header class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
				<div class="space-y-2">
					<h1 class="text-xl font-semibold text-foreground">{title}</h1>
					{description ? <p class="text-sm text-muted-foreground">{description}</p> : null}
					{children}
				</div>
				{action ? <div class="shrink-0">{action}</div> : null}
			</header>
		);
	});
