import { describe, it, expect } from 'vitest';
import { readResponseTextWithLimit } from './scanDomain.js';

// Regression tests for a reader leak in readResponseTextWithLimit: it used to
// acquire response.body.getReader() and return on three paths without ever
// cancelling/releasing the reader, leaving the underlying socket consuming
// the (potentially large) response body in the background across hundreds of
// fetches per scan. The fix wraps the read loop in try/finally and cancels
// the reader on every exit.

describe('readResponseTextWithLimit', () => {
	it('returns the full body when under the limit', async () => {
		const response = new Response('hello world', { status: 200 });
		const result = await readResponseTextWithLimit(response, 1024);
		expect(result).toBe('hello world');
	});

	it('truncates the body to the byte limit', async () => {
		// ASCII makes byte length == string length.
		const response = new Response('abcdefghij', { status: 200 });
		const result = await readResponseTextWithLimit(response, 4);
		expect(result).toBe('abcd');
	});

	it('releases the reader on the size-limit path (no leak)', async () => {
		// A large body that must be truncated mid-stream. After return, the
		// response body must no longer be locked — proving the reader was
		// cancelled/released rather than abandoned.
		const largeBody = 'x'.repeat(100_000);
		const response = new Response(largeBody, { status: 200 });

		await readResponseTextWithLimit(response, 64);

		// bodyUsed becomes true once the reader is acquired; a body is "locked"
		// while a reader holds it. After our cancel(), the stream is disturbed
		// but not locked. We assert it is NOT locked (the leak symptom).
		expect(response.body?.locked).toBe(false);
	});

	it('releases the reader on the normal-completion path', async () => {
		const response = new Response('small body', { status: 200 });
		await readResponseTextWithLimit(response, 1024);
		expect(response.body?.locked).toBe(false);
	});

	it('returns null for a response with no body', async () => {
		const response = new Response(null, { status: 204 });
		const result = await readResponseTextWithLimit(response, 1024);
		expect(result).toBe('');
	});
});
