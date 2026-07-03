import { createHash, timingSafeEqual as nodeTimingSafeEqual } from 'node:crypto';
import { z } from 'zod';

export const generateToken = z
	.function()
	.args()
	.returns(z.string())
	.implement(() => {
		return crypto.randomUUID() + crypto.randomUUID().replace(/-/g, '');
	});

export const timingSafeEqual = z
	.function()
	.args(z.string(), z.string())
	.returns(z.boolean())
	.implement((a, b) => {
		const bufA = Buffer.from(a, 'utf-8');
		const bufB = Buffer.from(b, 'utf-8');
		if (bufA.length === 0 || bufB.length === 0) return false;
		// nodeTimingSafeEqual throws on length mismatch, and returning early on
		// a length difference would itself leak the expected length by timing.
		// Compare against a same-length dummy to keep the cost constant, then
		// return false: the real result is always "not equal" when lengths
		// differ.
		if (bufA.length !== bufB.length) {
			const dummy = Buffer.alloc(bufA.length);
			try {
				nodeTimingSafeEqual(bufA, dummy);
			} catch {
				// ignore — we only need the CPU cost
			}
			return false;
		}
		try {
			return nodeTimingSafeEqual(bufA, bufB);
		} catch {
			return false;
		}
	});

export const hashToken = z
	.function()
	.args(z.string())
	.returns(z.string())
	.implement((token) => {
		return createHash('sha256').update(token).digest('hex');
	});
