/**
 * a middleware function that receives parameters and a next function.
 * can either handle the request or delegate to next.
 */
export type Middleware<TParams extends unknown[], TReturn> = (
	...params: [...TParams, next: (...params: TParams) => TReturn]
) => TReturn;

/**
 * composes an array of middleware into a single function.
 * the last middleware in the array acts as the final handler.
 *
 * @param middlewares array of middleware functions, with the handler as the last element
 * @returns a composed function that runs the middleware chain
 */
export function composeMiddleware<TParams extends unknown[], TReturn>(
	middlewares: [...Middleware<TParams, TReturn>[], Middleware<TParams, TReturn>],
): (...params: TParams) => TReturn {
	return middlewares.reduceRight<(...params: TParams) => TReturn>(
		(next, run) =>
			(...args) =>
				run(...args, next),
		() => {
			throw new Error('middleware chain exhausted');
		},
	);
}
