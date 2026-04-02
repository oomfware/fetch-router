import { createContextStore, type ContextStore } from './injection.ts';
import type { RequestMethod } from './request-methods.ts';

/**
 * a context object containing the request and matched route parameters.
 */
export interface RequestContext<
	// oxlint-disable-next-line no-unused-vars
	method extends RequestMethod | 'ANY' = RequestMethod | 'ANY',
	params extends Record<string, any> = Record<string, any>,
> {
	/** the original request */
	request: Request;
	/** the request's abort signal */
	signal: AbortSignal;
	/** the request method */
	method: RequestMethod;
	/** the parsed URL */
	url: URL;
	/** params parsed from the URL pattern */
	params: params;
	/** store for sharing values between middleware and handlers */
	store: ContextStore;
}

/**
 * creates a request context from a request.
 */
export function createRequestContext(request: Request): RequestContext {
	return {
		request,
		signal: request.signal,
		// oxlint-disable-next-line no-unsafe-type-assertion
		method: request.method as RequestMethod,
		url: new URL(request.url),
		params: {},
		store: createContextStore(),
	};
}
