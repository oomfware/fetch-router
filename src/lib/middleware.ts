import type { RequestContext } from './request-context.ts';
import type { RequestMethod } from './request-methods.ts';

/**
 * a function that invokes the next middleware or handler in the chain.
 *
 * @returns the response from the downstream handler
 */
export type NextFunction = () => Promise<Response>;

/**
 * middleware type for the router and route handlers.
 */
export type Middleware<
	method extends RequestMethod | 'ANY' = RequestMethod | 'ANY',
	params extends Record<string, string> = Record<string, string>,
> = (context: RequestContext<method, params>, next: NextFunction) => Promise<Response>;

/**
 * composes an array of router middleware into a single function.
 * the last middleware in the array acts as the final handler.
 *
 * @param middlewares array of router middleware functions, with the handler as the last element
 * @returns a composed function that runs the middleware chain
 */
export function composeMiddleware(
	middlewares: [...Middleware[], Middleware],
): (context: RequestContext) => Promise<Response> {
	return middlewares.reduceRight<(context: RequestContext) => Promise<Response>>(
		(next, run) => (ctx) => run(ctx, () => next(ctx)),
		() => {
			throw new Error('middleware chain exhausted');
		},
	);
}
