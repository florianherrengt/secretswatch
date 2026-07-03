import { describe, it, expect } from 'vitest';
import { ioredisClient } from './redis.js';

// Regression: the shared ioredis client had no 'error' listener. ioredis emits
// 'error' on connection failures, and with no listener Node throws it as an
// unhandled emitter error, crashing the process on any Redis blip/restart.
// The fix attaches a logging listener so the error is non-fatal and ioredis
// can reconnect. This test asserts the listener exists (so emitting an error
// does not throw) without depending on a real connection failure.

describe('ioredisClient error handling', () => {
	it('has an error listener so emitting an error does not throw', () => {
		// Listeners are stored on the emitter; a registered 'error' listener
		// means Node will route the event to it instead of throwing.
		const listeners = ioredisClient.listeners('error');
		expect(listeners.length).toBeGreaterThanOrEqual(1);
		expect(typeof listeners[0]).toBe('function');
	});

	it('emitting an error event does not throw (non-fatal)', () => {
		// Wrapping in a function lets us assert no throw. If the listener were
		// missing, this emit would throw synchronously (ERR_UNHANDLED_ERROR).
		expect(() => {
			ioredisClient.emit('error', new Error('synthetic test error'));
		}).not.toThrow();
	});
});
