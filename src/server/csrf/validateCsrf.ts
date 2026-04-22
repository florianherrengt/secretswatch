import { z } from 'zod';
import type { Context, Next } from 'hono';
import { extractSessionId } from '../auth/middleware.js';
import { timingSafeEqual } from '../auth/crypto.js';
import { getClientIp } from '../http/clientIp.js';
import { csrfTokenStore } from './csrfTokenStore.js';
import { render } from '../../lib/response.js';
import { ForbiddenPage } from '../../views/pages/forbidden.js';

const FORM_CONTENT_TYPE_REGEX =
	/^(application\/x-www-form-urlencoded|multipart\/form-data|text\/plain)/i;

const FORBIDDEN_MESSAGE =
	'Your request could not be verified. Please go back, refresh the page, and try again.';

const renderForbidden = z
	.function()
	.args(z.custom<Context>())
	.returns(z.union([z.instanceof(Response), z.promise(z.instanceof(Response))]))
	.implement((c) => {
		return c.html(render(ForbiddenPage as never, { message: FORBIDDEN_MESSAGE }), 403);
	});

export const validateCsrfToken = z
	.function()
	.args(z.custom<Context>(), z.custom<Next>())
	.returns(z.promise(z.union([z.instanceof(Response), z.void()])))
	.implement(async (c, next) => {
		const contentType = c.req.header('content-type') ?? 'text/plain';

		if (!FORM_CONTENT_TYPE_REGEX.test(contentType)) {
			await next();
			return;
		}

		const sessionId = extractSessionId(c);

		if (!sessionId) {
			console.error('CSRF validation failed', { path: c.req.path, ip: getClientIp(c) });
			return renderForbidden(c);
		}

		const body = await c.req.parseBody();
		const submittedToken = body._csrf;

		if (typeof submittedToken !== 'string' || !submittedToken) {
			console.error('CSRF validation failed', { path: c.req.path, ip: getClientIp(c) });
			return renderForbidden(c);
		}

		const storedToken = await csrfTokenStore.get(sessionId);

		if (!storedToken) {
			console.error('CSRF validation failed', { path: c.req.path, ip: getClientIp(c) });
			return renderForbidden(c);
		}

		if (!timingSafeEqual(submittedToken, storedToken)) {
			console.error('CSRF validation failed', { path: c.req.path, ip: getClientIp(c) });
			return renderForbidden(c);
		}

		await next();
	});
