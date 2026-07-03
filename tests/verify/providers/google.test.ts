import { describe, it, expect, vi, beforeEach } from 'vitest';
import { verifyGoogle } from '../../../src/server/routes/verify/providers/google.js';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('verifyGoogle', () => {
	beforeEach(() => {
		mockFetch.mockReset();
	});

	it('returns valid=true for 200 response', async () => {
		mockFetch.mockResolvedValueOnce(new Response(null, { status: 200 }));
		const result = await verifyGoogle({ apiKey: 'AIza-valid-key' });
		expect(result.valid).toBe(true);
		expect(result.reason).toBeUndefined();
	});

	it('returns valid=false with reason=rejected for 400 response', async () => {
		mockFetch.mockResolvedValueOnce(new Response(null, { status: 400 }));
		const result = await verifyGoogle({ apiKey: 'AIza-bad-key' });
		expect(result.valid).toBe(false);
		expect(result.reason).toBe('rejected');
	});

	it('returns valid=false with reason=error on network error', async () => {
		// Regression: network failures must be distinguishable from rejections.
		mockFetch.mockRejectedValueOnce(new Error('network failure'));
		const result = await verifyGoogle({ apiKey: 'AIza-key' });
		expect(result.valid).toBe(false);
		expect(result.reason).toBe('error');
	});

	it('returns valid=false with reason=rejected for missing credentials', async () => {
		const result = await verifyGoogle({});
		expect(result.valid).toBe(false);
		expect(result.reason).toBe('rejected');
	});
});
