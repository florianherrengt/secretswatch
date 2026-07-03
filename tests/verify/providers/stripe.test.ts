import { describe, it, expect, vi, beforeEach } from 'vitest';
import { verifyStripe } from '../../../src/server/routes/verify/providers/stripe.js';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('verifyStripe', () => {
	beforeEach(() => {
		mockFetch.mockReset();
	});

	it('returns valid=true for 200 response', async () => {
		mockFetch.mockResolvedValueOnce(new Response(null, { status: 200 }));
		const result = await verifyStripe({ apiKey: 'sk_live_valid' });
		expect(result.valid).toBe(true);
		expect(result.reason).toBeUndefined();
	});

	it('returns valid=false with reason=rejected for 401 response', async () => {
		mockFetch.mockResolvedValueOnce(new Response(null, { status: 401 }));
		const result = await verifyStripe({ apiKey: 'sk_live_bad' });
		expect(result.valid).toBe(false);
		expect(result.reason).toBe('rejected');
	});

	it('returns valid=false with reason=error on network error', async () => {
		// Regression: network failures must be distinguishable from rejections.
		mockFetch.mockRejectedValueOnce(new Error('network failure'));
		const result = await verifyStripe({ apiKey: 'sk_live_key' });
		expect(result.valid).toBe(false);
		expect(result.reason).toBe('error');
	});

	it('returns valid=false with reason=rejected for missing credentials', async () => {
		const result = await verifyStripe({});
		expect(result.valid).toBe(false);
		expect(result.reason).toBe('rejected');
	});
});
