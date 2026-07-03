import { describe, it, expect } from 'vitest';
import { verifyAws } from '../../../src/server/routes/verify/providers/aws.js';

describe('verifyAws', () => {
	it('returns valid=true for well-formed access key and secret', async () => {
		const result = await verifyAws({
			accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
			secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
		});
		expect(result.valid).toBe(true);
		expect(result.reason).toBeUndefined();
	});

	it('returns valid=false with reason=rejected for malformed access key id', async () => {
		const result = await verifyAws({
			accessKeyId: 'NOT-AWS-KEY',
			secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
		});
		expect(result.valid).toBe(false);
		expect(result.reason).toBe('rejected');
	});

	it('returns valid=false with reason=rejected for too-short secret key', async () => {
		const result = await verifyAws({
			accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
			secretAccessKey: 'tooshort',
		});
		expect(result.valid).toBe(false);
		expect(result.reason).toBe('rejected');
	});

	it('returns valid=false with reason=rejected for missing credentials', async () => {
		const result = await verifyAws({});
		expect(result.valid).toBe(false);
		expect(result.reason).toBe('rejected');
	});
});
