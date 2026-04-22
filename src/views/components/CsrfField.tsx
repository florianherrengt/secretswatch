import { z } from 'zod';
import type { FC } from 'hono/jsx';

const csrfFieldPropsSchema = z.object({
	token: z.string().min(1),
});

type CsrfFieldProps = z.infer<typeof csrfFieldPropsSchema>;

export const CsrfField: FC<CsrfFieldProps> = z
	.function()
	.args(csrfFieldPropsSchema)
	.returns(z.custom<ReturnType<FC<CsrfFieldProps>>>())
	.implement(({ token }) => {
		return <input type="hidden" name="_csrf" value={token} />;
	});
