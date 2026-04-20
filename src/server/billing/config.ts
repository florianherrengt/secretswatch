import { z } from 'zod';

export const isStripeConfigured = z
	.function()
	.args()
	.returns(z.boolean())
	.implement(() => {
		return (process.env.STRIPE_SECRET_KEY ?? '').trim().length > 0;
	});
