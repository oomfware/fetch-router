import { ArrayMatcher, RoutePattern, type Matcher } from '@remix-run/route-pattern';

import {
	isActionWithMiddleware,
	isControllerWithMiddleware,
	type Action,
	type Controller,
	type RequestHandler,
} from './controller.ts';
import { composeMiddleware, type Middleware } from './middleware.ts';
import { createRequestContext, type RequestContext } from './request-context.ts';
import type { RequestMethod } from './request-methods.ts';
import { Route, type RouteMap } from './route-map.ts';

/** middleware type for the router */
export type RouterMiddleware = Middleware<[RequestContext], Promise<Response>>;

export type MatchData = {
	runner: (context: RequestContext) => Promise<Response>;
	method: RequestMethod | 'ANY';
};

/**
 * the valid types for the first argument to `router.map()`.
 */
export type MapTarget = string | RoutePattern<string> | Route<RequestMethod | 'ANY', string> | RouteMap;

/**
 * infer the correct handler type (Action or Controller) based on the map target.
 */
// prettier-ignore
export type MapHandler<target extends MapTarget> =
  target extends string ? Action<RequestMethod | 'ANY', target> :
  target extends RoutePattern<infer pattern extends string> ? Action<RequestMethod | 'ANY', pattern> :
  target extends Route<RequestMethod | 'ANY', infer pattern extends string> ? Action<RequestMethod | 'ANY', pattern> :
  target extends RouteMap ? Controller<target> :
  never

/**
 * options for creating a router.
 */
export interface RouterOptions {
	/**
	 * the default request handler that runs when no route matches.
	 *
	 * @default a 404 "Not Found" response
	 */
	defaultHandler?: RequestHandler;
	/**
	 * the matcher to use for matching routes.
	 *
	 * @default `new ArrayMatcher()`
	 */
	matcher?: Matcher<MatchData>;
	/**
	 * global middleware to run for all routes. this middleware runs on every request before any
	 * routes are matched.
	 */
	middleware?: RouterMiddleware[];
}

/**
 * a router maps incoming requests to request handlers and middleware.
 */
export interface Router {
	/**
	 * fetch a response from the router.
	 *
	 * @param input the request input to fetch
	 * @param init the request init options
	 * @returns the response from the route that matched the request
	 */
	fetch(input: string | URL | Request, init?: RequestInit): Promise<Response>;
	/**
	 * the number of routes in the router.
	 */
	readonly size: number;
	/**
	 * add a route to the router.
	 *
	 * @param method the request method to match
	 * @param pattern the pattern to match
	 * @param action the action to invoke when the route matches
	 */
	route<method extends RequestMethod | 'ANY', pattern extends string>(
		method: method,
		pattern: pattern | RoutePattern<pattern> | Route<method | 'ANY', pattern>,
		action: Action<method, pattern>,
	): void;
	/**
	 * map a route or route map to an action or controller.
	 *
	 * @param target the route/pattern or route map to match
	 * @param handler the action or controller to invoke when the route(s) match
	 */
	map<target extends MapTarget>(target: target, handler: MapHandler<target>): void;
	/**
	 * map a `GET` route/pattern to an action.
	 *
	 * @param route the route/pattern to match
	 * @param action the action to invoke when the route matches
	 */
	get<pattern extends string>(
		route: pattern | RoutePattern<pattern> | Route<'GET' | 'ANY', pattern>,
		action: Action<'GET', pattern>,
	): void;
	/**
	 * map a `HEAD` route/pattern to an action.
	 *
	 * @param route the route/pattern to match
	 * @param action the action to invoke when the route matches
	 */
	head<pattern extends string>(
		route: pattern | RoutePattern<pattern> | Route<'HEAD' | 'ANY', pattern>,
		action: Action<'HEAD', pattern>,
	): void;
	/**
	 * map a `POST` route/pattern to an action.
	 *
	 * @param route the route/pattern to match
	 * @param action the action to invoke when the route matches
	 */
	post<pattern extends string>(
		route: pattern | RoutePattern<pattern> | Route<'POST' | 'ANY', pattern>,
		action: Action<'POST', pattern>,
	): void;
	/**
	 * map a `PUT` route/pattern to an action.
	 *
	 * @param route the route/pattern to match
	 * @param action the action to invoke when the route matches
	 */
	put<pattern extends string>(
		route: pattern | RoutePattern<pattern> | Route<'PUT' | 'ANY', pattern>,
		action: Action<'PUT', pattern>,
	): void;
	/**
	 * map a `PATCH` route/pattern to an action.
	 *
	 * @param route the route/pattern to match
	 * @param action the action to invoke when the route matches
	 */
	patch<pattern extends string>(
		route: pattern | RoutePattern<pattern> | Route<'PATCH' | 'ANY', pattern>,
		action: Action<'PATCH', pattern>,
	): void;
	/**
	 * map a `DELETE` route/pattern to an action.
	 *
	 * @param route the route/pattern to match
	 * @param action the action to invoke when the route matches
	 */
	delete<pattern extends string>(
		route: pattern | RoutePattern<pattern> | Route<'DELETE' | 'ANY', pattern>,
		action: Action<'DELETE', pattern>,
	): void;
	/**
	 * map an `OPTIONS` route/pattern to an action.
	 *
	 * @param route the route/pattern to match
	 * @param action the action to invoke when the route matches
	 */
	options<pattern extends string>(
		route: pattern | RoutePattern<pattern> | Route<'OPTIONS' | 'ANY', pattern>,
		action: Action<'OPTIONS', pattern>,
	): void;
}

function noMatchHandler(context: RequestContext): Response {
	return new Response(`Not Found: ${context.url.pathname}`, { status: 404 });
}

/**
 * create a new router.
 *
 * @param options options to configure the router
 * @returns the new router
 */
export function createRouter(options?: RouterOptions): Router {
	const defaultHandler = options?.defaultHandler ?? noMatchHandler;
	const matcher = options?.matcher ?? new ArrayMatcher<MatchData>();
	const globalMiddleware = options?.middleware;

	function dispatch(context: RequestContext): Promise<Response> {
		for (const match of matcher.matchAll(context.url)) {
			const { runner, method } = match.data;

			if (method !== context.method && method !== 'ANY') {
				// request method does not match, continue to next match
				continue;
			}

			context.params = match.params;

			return runner(context);
		}

		return Promise.resolve(defaultHandler(context));
	}

	// compose global middleware with dispatch
	let globalRunner = dispatch;
	if (globalMiddleware && globalMiddleware.length > 0) {
		globalRunner = composeMiddleware([...globalMiddleware, globalRunner]);
	}

	function addRoute<method extends RequestMethod | 'ANY', pattern extends string>(
		method: method,
		route: pattern | RoutePattern<pattern> | Route<method | 'ANY', pattern>,
		action: Action<method, pattern>,
	): void {
		let middlewares: RouterMiddleware[] = [];
		let handler: RequestHandler<any, any>;

		if (isActionWithMiddleware(action)) {
			if (action.middleware.length > 0) {
				middlewares = action.middleware;
			}
			handler = action.action;
		} else {
			handler = action as RequestHandler<any, any>;
		}

		// compose route middleware with handler
		let runner = (ctx: RequestContext) => Promise.resolve(handler(ctx));
		if (middlewares.length > 0) {
			runner = composeMiddleware([...middlewares, runner]);
		}

		matcher.add(route instanceof Route ? route.pattern : route, {
			runner,
			method,
		});
	}

	function mapRoutes(target: MapTarget, handler: unknown): void {
		// single route: string, RoutePattern, or Route
		if (typeof target === 'string' || target instanceof RoutePattern || target instanceof Route) {
			addRoute('ANY', target, handler as Action<any, any>);
			return;
		}

		// route map
		if (isControllerWithMiddleware(handler)) {
			// map(routes, { middleware, actions })
			mapControllerWithMiddleware(target, handler.middleware, handler.actions);
		} else {
			// map(routes, controller)
			mapController(target, handler as Record<string, unknown>);
		}
	}

	function mapControllerWithMiddleware(
		routes: RouteMap,
		middleware: RouterMiddleware[],
		actions: Record<string, unknown>,
	): void {
		for (const key in routes) {
			const route = routes[key];
			const action = actions[key];

			if (route instanceof Route) {
				// single route - check if action has its own middleware
				if (isActionWithMiddleware(action)) {
					addRoute(route.method, route.pattern, {
						middleware: middleware.concat(action.middleware),
						action: action.action,
					});
				} else {
					addRoute(route.method, route.pattern, {
						middleware,
						action: action as RequestHandler<any, any>,
					});
				}
			} else if (isControllerWithMiddleware(action)) {
				// nested controller with its own middleware - merge and recurse
				mapControllerWithMiddleware(route as RouteMap, middleware.concat(action.middleware), action.actions);
			} else {
				// nested controller without middleware - pass down current middleware
				mapControllerWithMiddleware(route as RouteMap, middleware, action as Record<string, unknown>);
			}
		}
	}

	function mapController(routes: RouteMap, controller: Record<string, unknown>): void {
		for (const key in routes) {
			const route = routes[key];
			const action = controller[key];

			if (route instanceof Route) {
				addRoute(route.method, route.pattern, action as Action<any, any>);
			} else {
				mapRoutes(route as RouteMap, action);
			}
		}
	}

	return {
		async fetch(input: string | URL | Request, init?: RequestInit): Promise<Response> {
			let request: Request;
			if (input instanceof Request) {
				request = init ? new Request(input, init) : input;
			} else if (input instanceof URL) {
				request = new Request(input.href, init);
			} else {
				request = new Request(input, init);
			}

			if (request.signal.aborted) {
				return new Response(null, { status: 499 });
			}

			const context = createRequestContext(request);

			try {
				return await globalRunner(context);
			} catch (error) {
				if (request.signal.aborted) {
					return new Response(null, { status: 499 });
				}
				throw error;
			}
		},
		get size(): number {
			return matcher.size;
		},
		route: addRoute,
		map: mapRoutes,
		get<pattern extends string>(
			route: pattern | RoutePattern<pattern> | Route<'GET' | 'ANY', pattern>,
			action: Action<'GET', pattern>,
		): void {
			addRoute('GET', route, action);
		},
		head<pattern extends string>(
			route: pattern | RoutePattern<pattern> | Route<'HEAD' | 'ANY', pattern>,
			action: Action<'HEAD', pattern>,
		): void {
			addRoute('HEAD', route, action);
		},
		post<pattern extends string>(
			route: pattern | RoutePattern<pattern> | Route<'POST' | 'ANY', pattern>,
			action: Action<'POST', pattern>,
		): void {
			addRoute('POST', route, action);
		},
		put<pattern extends string>(
			route: pattern | RoutePattern<pattern> | Route<'PUT' | 'ANY', pattern>,
			action: Action<'PUT', pattern>,
		): void {
			addRoute('PUT', route, action);
		},
		patch<pattern extends string>(
			route: pattern | RoutePattern<pattern> | Route<'PATCH' | 'ANY', pattern>,
			action: Action<'PATCH', pattern>,
		): void {
			addRoute('PATCH', route, action);
		},
		delete<pattern extends string>(
			route: pattern | RoutePattern<pattern> | Route<'DELETE' | 'ANY', pattern>,
			action: Action<'DELETE', pattern>,
		): void {
			addRoute('DELETE', route, action);
		},
		options<pattern extends string>(
			route: pattern | RoutePattern<pattern> | Route<'OPTIONS' | 'ANY', pattern>,
			action: Action<'OPTIONS', pattern>,
		): void {
			addRoute('OPTIONS', route, action);
		},
	};
}
