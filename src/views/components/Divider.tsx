import { z } from 'zod';
import type { FC } from 'hono/jsx';

const dividerPropsSchema = z.object({
	class: z.string().optional(),
});

type DividerProps = z.infer<typeof dividerPropsSchema>;

export const Divider: FC<DividerProps> = z
	.function()
	.args(dividerPropsSchema)
	.returns(z.custom<ReturnType<FC<DividerProps>>>())
	.implement(({ class: classValue }) => {
		const classes = ['border-0 border-t border-muted', classValue ?? ''].join(' ').trim();
		return <hr class={classes} />;
	});
