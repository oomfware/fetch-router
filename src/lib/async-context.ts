import { AsyncLocalStorage } from 'node:async_hooks';

import type { Middleware } from './middleware.ts';
import type { RequestContext } from './request-context.ts';

const storage = new AsyncLocalStorage<RequestContext>();

/**
 * middleware that stores the request context in `AsyncLocalStorage` so it is available
 * to all functions in the same async execution context.
 *
 * @returns a middleware function that stores the request context
 */
export function asyncContext(): Middleware {
	return (context, next) => storage.run(context, next);
}

/**
 * get the request context from `AsyncLocalStorage`.
 *
 * @returns the request context
 * @throws if called outside of an async context (i.e., asyncContext middleware not installed)
 */
export function getContext(): RequestContext {
	const context = storage.getStore();

	if (context == null) {
		throw new Error('no request context found. make sure the asyncContext middleware is installed.');
	}

	return context;
}
