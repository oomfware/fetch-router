import { describe, expect, it } from 'bun:test';

import { ArrayMatcher, RoutePattern } from '@remix-run/route-pattern';

import type { BuildAction } from './controller.ts';
import { createRoutes as route } from './route-map.ts';
import type { Middleware } from './middleware.ts';
import { createRouter, type MatchData } from './router.ts';

describe('router.fetch()', () => {
	it('fetches a route', async () => {
		let router = createRouter();
		router.get('/', () => new Response('Home'));

		let response = await router.fetch('https://remix.run');

		expect(response.status).toBe(200);
		expect(await response.text()).toBe('Home');
	});

	it('fetches a route with middleware', async () => {
		let routes = route({
			home: '/',
		});

		let requestLog: string[] = [];
		let router = createRouter();

		router.get(routes.home, {
			middleware: [
				(_ctx, next) => {
					requestLog.push('middleware');
					return next();
				},
			],
			action() {
				return new Response('Home');
			},
		});

		let response = await router.fetch('https://remix.run');

		expect(response.status).toBe(200);
		expect(await response.text()).toBe('Home');

		expect(requestLog.length).toBe(1);
		expect(requestLog).toEqual(['middleware']);
	});

	it('runs router middleware before fetching a route', async () => {
		let routes = route({
			home: '/',
		});

		let requestLog: string[] = [];
		let router = createRouter({
			middleware: [
				(ctx, next) => {
					requestLog.push('router middleware');
					return next();
				},
			],
		});

		router.get(routes.home, {
			middleware: [
				(ctx, next) => {
					requestLog.push('route middleware');
					return next();
				},
			],
			action() {
				return new Response('Home');
			},
		});

		let response = await router.fetch('https://remix.run');
		expect(response.status).toBe(200);
		expect(await response.text()).toBe('Home');
		expect(requestLog).toEqual(['router middleware', 'route middleware']);
	});

	it('fetches a route with specific method actions', async () => {
		let routes = route({
			home: '/',
		});

		let router = createRouter();

		router.get(routes.home, () => new Response('GET'));
		router.head(routes.home, () => new Response('HEAD'));
		router.post(routes.home, () => new Response('POST'));
		router.put(routes.home, () => new Response('PUT'));
		router.patch(routes.home, () => new Response('PATCH'));
		router.delete(routes.home, () => new Response('DELETE'));
		router.options(routes.home, () => new Response('OPTIONS'));

		for (let method of ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']) {
			let response = await router.fetch('https://remix.run', { method });
			expect(response.status).toBe(200);
			expect(await response.text()).toBe(method);
		}
	});

	it('runs router middleware even when there are no routes', async () => {
		let requestLog: string[] = [];
		let router = createRouter({
			middleware: [
				(ctx, next) => {
					requestLog.push('middleware');
					return next();
				},
			],
		});

		let response = await router.fetch('https://remix.run/nonexistent');
		expect(response.status).toBe(404);
		expect(await response.text()).toBe('Not Found: /nonexistent');
		expect(requestLog).toEqual(['middleware']);
	});

	it('runs router middleware even when no route matches', async () => {
		let requestLog: string[] = [];
		let router = createRouter({
			middleware: [
				(ctx, next) => {
					requestLog.push('middleware');
					return next();
				},
			],
		});

		router.get('/', () => {
			return new Response('Home');
		});

		let response = await router.fetch('https://remix.run/nonexistent');
		expect(response.status).toBe(404);
		expect(await response.text()).toBe('Not Found: /nonexistent');
		expect(requestLog).toEqual(['middleware']);
	});
});

describe('router.map() with single routes', () => {
	it('maps a single route to a request handler', async () => {
		let routes = route({
			home: '/',
		});

		let router = createRouter();

		router.map(routes.home, () => {
			return new Response('Home');
		});

		let response = await router.fetch('https://remix.run');

		expect(response.status).toBe(200);
		expect(await response.text()).toBe('Home');
	});

	it('maps a single route to an action with middleware', async () => {
		let routes = route({
			profile: '/profile/:id',
		});

		let requestLog: string[] = [];
		let router = createRouter();

		router.map(routes.profile, {
			middleware: [
				(context, next) => {
					requestLog.push(`middleware ${context.params.id}`);
					return next();
				},
			],
			action() {
				requestLog.push('action');
				return new Response('OK');
			},
		});

		let response = await router.fetch('https://remix.run/profile/1');
		expect(response.status).toBe(200);
		expect(await response.text()).toBe('OK');

		expect(requestLog).toEqual(['middleware 1', 'action']);
	});

	it('matches any request method', async () => {
		let router = createRouter();

		router.map('/', ({ method }) => new Response(method));

		for (let method of ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']) {
			let response = await router.fetch('https://remix.run', { method });
			expect(response.status).toBe(200);
			expect(await response.text()).toBe(method);
		}
	});
});

describe('router.map()', () => {
	it('maps a route map to a map of actions', async () => {
		let routes = route({
			home: '/',
			blog: {
				index: { method: 'GET', pattern: '/blog' },
				create: { method: 'POST', pattern: '/blog' },
				show: '/blog/:id',
			},
		});

		let router = createRouter();

		router.map(routes, {
			home() {
				return new Response('Home');
			},
			blog: {
				index() {
					return new Response('Blog');
				},
				create() {
					return new Response('Blog Post Created');
				},
				show({ params }) {
					return new Response(`Blog Post ${params.id}`);
				},
			},
		});

		let response = await router.fetch('https://remix.run');
		expect(response.status).toBe(200);
		expect(await response.text()).toBe('Home');

		response = await router.fetch('https://remix.run/blog');
		expect(response.status).toBe(200);
		expect(await response.text()).toBe('Blog');

		response = await router.fetch('https://remix.run/blog', { method: 'POST' });
		expect(response.status).toBe(200);
		expect(await response.text()).toBe('Blog Post Created');

		response = await router.fetch('https://remix.run/blog/1');
		expect(response.status).toBe(200);
		expect(await response.text()).toBe('Blog Post 1');
	});

	it('maps a route map to actions with middleware', async () => {
		let routes = route({
			home: '/',
		});

		let requestLog: string[] = [];
		let router = createRouter();

		router.map(routes, {
			middleware: [
				(ctx, next) => {
					requestLog.push('middleware');
					return next();
				},
			],
			actions: {
				home() {
					requestLog.push('action');
					return new Response('OK');
				},
			},
		});

		let response = await router.fetch('https://remix.run/');
		expect(response.status).toBe(200);
		expect(await response.text()).toBe('OK');

		expect(requestLog).toEqual(['middleware', 'action']);
	});

	it('supports middleware in nested controllers', async () => {
		let routes = route({
			blog: {
				index: '/blog',
				show: '/blog/:id',
			},
		});

		let requestLog: string[] = [];
		let router = createRouter();

		router.map(routes, {
			middleware: [
				(ctx, next) => {
					requestLog.push('outer middleware');
					return next();
				},
			],
			actions: {
				blog: {
					middleware: [
						(ctx, next) => {
							requestLog.push('inner middleware');
							return next();
						},
					],
					actions: {
						index() {
							requestLog.push('blog-index');
							return new Response('Blog');
						},
						show() {
							requestLog.push('blog-show');
							return new Response('Blog Post');
						},
					},
				},
			},
		});

		let response = await router.fetch('https://remix.run/blog');
		expect(response.status).toBe(200);
		expect(await response.text()).toBe('Blog');
		expect(requestLog).toEqual(['outer middleware', 'inner middleware', 'blog-index']);

		requestLog = [];

		response = await router.fetch('https://remix.run/blog/1');
		expect(response.status).toBe(200);
		expect(await response.text()).toBe('Blog Post');
		expect(requestLog).toEqual(['outer middleware', 'inner middleware', 'blog-show']);
	});

	it('runs both global and inline middleware', async () => {
		let routes = route({
			home: '/',
		});

		let requestLog: string[] = [];
		let router = createRouter({
			middleware: [
				(ctx, next) => {
					requestLog.push('global');
					return next();
				},
			],
		});

		router.map(routes, {
			middleware: [
				(ctx, next) => {
					requestLog.push('inline');
					return next();
				},
			],
			actions: {
				home() {
					requestLog.push('action');
					return new Response('OK');
				},
			},
		});

		let response = await router.fetch('https://remix.run/');
		expect(response.status).toBe(200);
		expect(await response.text()).toBe('OK');

		expect(requestLog).toEqual(['global', 'inline', 'action']);
	});
});

describe('router.get()', () => {
	it('maps a single route to a request handler', async () => {
		let router = createRouter();
		router.get('/', () => new Response('Home'));

		let response = await router.fetch('https://remix.run');
		expect(response.status).toBe(200);
		expect(await response.text()).toBe('Home');
	});

	it('maps a single route to an action with middleware', async () => {
		let requestLog: string[] = [];
		let router = createRouter();
		router.get('/', {
			middleware: [
				(ctx, next) => {
					requestLog.push('middleware');
					return next();
				},
			],
			action() {
				return new Response('Home');
			},
		});
		let response = await router.fetch('https://remix.run');
		expect(response.status).toBe(200);
		expect(await response.text()).toBe('Home');
		expect(requestLog).toEqual(['middleware']);
	});

	it('maps a single route to an action with externally defined middleware', async () => {
		let routes = route({
			home: '/',
		});

		let requestLog: string[] = [];

		const auth: Middleware = (ctx, next) => {
			requestLog.push('auth');
			return next();
		};

		const home = {
			middleware: [auth],
			action() {
				return new Response('Home');
			},
		} satisfies BuildAction<'ANY', typeof routes.home>;

		let router = createRouter();
		router.map(routes.home, home);

		let response = await router.fetch('https://remix.run');
		expect(response.status).toBe(200);
		expect(await response.text()).toBe('Home');
		expect(requestLog).toEqual(['auth']);
	});

	it('inline middleware gets typed params', async () => {
		let routes = route({
			profile: '/profile/:id',
		});

		let capturedId: string | undefined;
		let router = createRouter();

		const auth: Middleware = (ctx, next) => {
			return next();
		};

		const profile: BuildAction<'ANY', typeof routes.profile> = {
			middleware: [
				auth,
				(ctx, next) => {
					// this verifies ctx.params.id is typed (not just Record<string, string>)
					capturedId = ctx.params.id;
					return next();
				},
			],
			action({ params }) {
				return new Response(`Profile ${params.id}`);
			},
		};

		router.map(routes.profile, profile);

		let response = await router.fetch('https://remix.run/profile/123');
		expect(response.status).toBe(200);
		expect(await response.text()).toBe('Profile 123');
		expect(capturedId).toBe('123');
	});
});

describe('inline middleware', () => {
	it('runs after global middleware', async () => {
		let requestLog: string[] = [];
		let router = createRouter({
			middleware: [
				(ctx, next) => {
					requestLog.push('global');
					return next();
				},
			],
		});

		router.get('/', {
			middleware: [
				(ctx, next) => {
					requestLog.push('inline-1');
					return next();
				},
				(ctx, next) => {
					requestLog.push('inline-2');
					return next();
				},
			],
			action() {
				requestLog.push('action');
				return new Response('OK');
			},
		});

		let response = await router.fetch('https://remix.run/');
		expect(response.status).toBe(200);
		expect(requestLog).toEqual(['global', 'inline-1', 'inline-2', 'action']);
	});

	it('runs only on the route it is defined on', async () => {
		let requestLog: string[] = [];
		let router = createRouter();

		router.get('/a', {
			middleware: [
				(ctx, next) => {
					requestLog.push('inline-a');
					return next();
				},
			],
			action() {
				requestLog.push('action-a');
				return new Response('A');
			},
		});

		router.get('/b', () => {
			requestLog.push('action-b');
			return new Response('B');
		});

		let response = await router.fetch('https://remix.run/a');
		expect(response.status).toBe(200);
		expect(await response.text()).toBe('A');
		expect(requestLog).toEqual(['inline-a', 'action-a']);

		requestLog = [];
		response = await router.fetch('https://remix.run/b');
		expect(response.status).toBe(200);
		expect(await response.text()).toBe('B');
		expect(requestLog).toEqual(['action-b']);
	});

	it('works with empty middleware array', async () => {
		let requestLog: string[] = [];
		let router = createRouter();

		router.get('/', {
			middleware: [],
			action() {
				requestLog.push('action');
				return new Response('OK');
			},
		});

		let response = await router.fetch('https://remix.run/');
		expect(response.status).toBe(200);
		expect(requestLog).toEqual(['action']);
	});

	it('handles middleware that returns a response (short-circuits)', async () => {
		let requestLog: string[] = [];
		let router = createRouter();

		router.get('/', {
			middleware: [
				(ctx, next) => {
					requestLog.push('m1');
					return next();
				},
				() => {
					requestLog.push('m2-short-circuit');
					return Promise.resolve(new Response('Blocked', { status: 403 }));
				},
				(ctx, next) => {
					requestLog.push('m3');
					return next();
				},
			],
			action() {
				requestLog.push('action');
				return new Response('OK');
			},
		});

		let response = await router.fetch('https://remix.run/');
		expect(response.status).toBe(403);
		expect(await response.text()).toBe('Blocked');
		expect(requestLog).toEqual(['m1', 'm2-short-circuit']);
	});
});

describe('404 handling', () => {
	it('returns a 404 response when no route matches', async () => {
		let router = createRouter();
		router.get('/home', () => new Response('Home'));

		let response = await router.fetch('https://remix.run/nonexistent');

		expect(response.status).toBe(404);
		expect(await response.text()).toBe('Not Found: /nonexistent');
	});

	it('supports a custom defaultHandler', async () => {
		let router = createRouter({
			defaultHandler({ url }) {
				return new Response(`Custom 404: ${url.pathname}`, {
					status: 404,
					headers: { 'X-Custom': 'true' },
				});
			},
		});

		router.get('/home', () => new Response('Home'));

		let response = await router.fetch('https://remix.run/missing');

		expect(response.status).toBe(404);
		expect(await response.text()).toBe('Custom 404: /missing');
		expect(response.headers.get('X-Custom')).toBe('true');
	});

	it('calls defaultHandler only when no routes match', async () => {
		let defaultCalls = 0;
		let router = createRouter({
			defaultHandler() {
				defaultCalls++;
				return new Response('Not Found', { status: 404 });
			},
		});

		router.get('/', () => new Response('Home'));
		router.get('/about', () => new Response('About'));

		await router.fetch('https://remix.run/');
		expect(defaultCalls).toBe(0);

		await router.fetch('https://remix.run/about');
		expect(defaultCalls).toBe(0);

		await router.fetch('https://remix.run/missing');
		expect(defaultCalls).toBe(1);
	});
});

describe('error handling', () => {
	it('propagates errors thrown in request handlers', async () => {
		let router = createRouter();
		router.get('/', () => {
			throw new Error('Action error');
		});

		await expect(router.fetch('https://remix.run/')).rejects.toThrow('Action error');
	});

	it('propagates async errors thrown in route actions', async () => {
		let router = createRouter();
		router.get('/', async () => {
			await Promise.resolve();
			throw new Error('Async action error');
		});

		await expect(router.fetch('https://remix.run/')).rejects.toThrow('Async action error');
	});

	it('propagates errors thrown in router middleware', async () => {
		let router = createRouter({
			middleware: [
				() => {
					throw new Error('Router middleware error');
				},
			],
		});

		router.get('/', () => new Response('OK'));

		await expect(router.fetch('https://remix.run/')).rejects.toThrow('Router middleware error');
	});

	it('propagates errors thrown in route middleware', async () => {
		let router = createRouter();

		router.get('/', {
			middleware: [
				() => {
					throw new Error('Route middleware error');
				},
			],
			action() {
				return new Response('OK');
			},
		});

		await expect(router.fetch('https://remix.run/')).rejects.toThrow('Route middleware error');
	});

	it('propagates errors thrown in the default handler', async () => {
		let router = createRouter({
			defaultHandler() {
				throw new Error('Default handler error');
			},
		});

		router.get('/home', () => new Response('Home'));

		await expect(router.fetch('https://remix.run/missing')).rejects.toThrow('Default handler error');
	});

	it('allows middleware to catch and handle errors from downstream', async () => {
		let router = createRouter({
			middleware: [
				async (ctx, next) => {
					try {
						return await next();
					} catch (error) {
						return new Response(`Caught: ${(error as Error).message}`, { status: 500 });
					}
				},
			],
		});

		router.get('/', () => {
			throw new Error('Action error');
		});

		let response = await router.fetch('https://remix.run/');
		expect(response.status).toBe(500);
		expect(await response.text()).toBe('Caught: Action error');
	});
});

describe('custom matcher', () => {
	it('uses a custom matcher when provided', async () => {
		let matchAllCalls = 0;

		class CustomMatcher extends ArrayMatcher<MatchData> {
			override *matchAll(url: string | URL) {
				matchAllCalls++;
				yield* super.matchAll(url);
			}
		}

		let customMatcher = new CustomMatcher();
		let router = createRouter({ matcher: customMatcher });
		router.get('/', () => new Response('Home'));

		await router.fetch('https://remix.run/');

		expect(matchAllCalls).toBeGreaterThan(0);
	});

	it('adds routes to the custom matcher', async () => {
		let addedPatterns: string[] = [];

		class CustomMatcher extends ArrayMatcher<MatchData> {
			override add<P extends string>(pattern: P | RoutePattern<P>, data: MatchData): void {
				let routePattern = typeof pattern === 'string' ? new RoutePattern(pattern) : pattern;
				addedPatterns.push(routePattern.source);
				super.add(pattern, data);
			}
		}

		let customMatcher = new CustomMatcher();
		let router = createRouter({ matcher: customMatcher });
		router.get('/home', () => new Response('Home'));
		router.get('/about', () => new Response('About'));

		expect(addedPatterns).toEqual(['/home', '/about']);
	});
});
