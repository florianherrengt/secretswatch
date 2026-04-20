import { z } from 'zod';
import type { FC } from 'hono/jsx';
import { Layout } from '../layout.js';

export const errorPagePropsSchema = z.object({
	title: z.string().min(1).default('Error'),
	message: z.string().min(1),
});

export type ErrorPageProps = z.infer<typeof errorPagePropsSchema>;

export const ErrorPage: FC<ErrorPageProps> = z
	.function()
	.args(errorPagePropsSchema)
	.returns(z.custom<ReturnType<FC<ErrorPageProps>>>())
	.implement(({ title, message }) => {
		return (
			<Layout title={title}>
				<div class="space-y-6">
					<h1 class="text-xl font-semibold text-foreground">{title}</h1>
					<p class="text-sm text-muted-foreground">{message}</p>
					<button
						type="button"
						onclick="history.back()"
						class="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
					>
						Go back
					</button>
				</div>
			</Layout>
		);
	});
