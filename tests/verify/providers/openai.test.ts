import { describe, it, expect, vi, beforeEach } from 'vitest';
import { verifyOpenAi } from '../../../src/server/routes/verify/providers/openai.js';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('verifyOpenAi', () => {
	beforeEach(() => {
		mockFetch.mockReset();
	});

	it('returns valid=true for 200 response', async () => {
		mockFetch.mockResolvedValueOnce(new Response(null, { status: 200 }));
		const result = await verifyOpenAi({ apiKey: 'sk-valid-key' });
		expect(result.valid).toBe(true);
		expect(result.reason).toBeUndefined();
	});

	it('returns valid=false with reason=rejected for 401 response', async () => {
		// The provider confirmed the credential is bad; that is a rejection,
		// not an indeterminate failure.
		mockFetch.mockResolvedValueOnce(new Response(null, { status: 401 }));
		const result = await verifyOpenAi({ apiKey: 'sk-bad-key' });
		expect(result.valid).toBe(false);
		expect(result.reason).toBe('rejected');
	});

	it('returns valid=false with reason=error on network error', async () => {
		// Regression: a timeout / network failure used to be indistinguishable
		// from a rejection, which made the UI claim a valid key was revoked.
		mockFetch.mockRejectedValueOnce(new Error('network failure'));
		const result = await verifyOpenAi({ apiKey: 'sk-key' });
		expect(result.valid).toBe(false);
		expect(result.reason).toBe('error');
	});

	it('returns valid=false with reason=rejected for missing credentials', async () => {
		const result = await verifyOpenAi({});
		expect(result.valid).toBe(false);
		expect(result.reason).toBe('rejected');
	});
});
