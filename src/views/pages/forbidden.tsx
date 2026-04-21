import { z } from 'zod';
import type { FC } from 'hono/jsx';
import { Layout } from '../layout.js';

const forbiddenPagePropsSchema = z.object({
	message: z.string().min(1),
});

export type ForbiddenPageProps = z.infer<typeof forbiddenPagePropsSchema>;

export const ForbiddenPage: FC<ForbiddenPageProps> = z
	.function()
	.args(forbiddenPagePropsSchema)
	.returns(z.custom<ReturnType<FC<ForbiddenPageProps>>>())
	.implement(({ message }) => {
		return (
			<Layout title="Forbidden" topNavMode="auth">
				<div class="space-y-4">
					<h1 class="text-xl font-semibold text-foreground">Forbidden</h1>
					<p data-testid="csrf-forbidden" class="text-sm text-foreground">
						{message}
					</p>
					<a
						href="/"
						class="inline-flex rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
					>
						Go back home
					</a>
				</div>
			</Layout>
		);
	});
