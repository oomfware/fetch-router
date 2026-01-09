import { describe, expect, it } from 'bun:test';

import { asyncContext, getContext } from './async-context.ts';
import { createInjectionKey } from './injection.ts';
import { createRoutes } from './route-map.ts';
import { createRouter } from './router.ts';

describe('asyncContext', () => {
	it('stores the request context in AsyncLocalStorage', async () => {
		const routes = createRoutes({
			home: '/',
		});

		const router = createRouter({
			middleware: [asyncContext()],
		});

		router.map(routes, {
			home(context) {
				expect(context).toBe(getContext() as typeof context);
				return new Response('Home');
			},
		});

		await router.fetch('https://example.com');
	});

	it('provides access to context from nested functions', async () => {
		const routes = createRoutes({
			home: '/',
		});

		const router = createRouter({
			middleware: [asyncContext()],
		});

		function getParams() {
			return getContext().params;
		}

		router.map(routes, {
			home() {
				const params = getParams();
				expect(params).toEqual({});
				return new Response('Home');
			},
		});

		await router.fetch('https://example.com');
	});

	it('provides access to store from nested functions', async () => {
		const routes = createRoutes({
			home: '/',
		});

		const userKey = createInjectionKey<{ name: string }>();

		const router = createRouter({
			middleware: [
				asyncContext(),
				(context, next) => {
					context.store.provide(userKey, { name: 'alice' });
					return next();
				},
			],
		});

		function getUser() {
			return getContext().store.inject(userKey);
		}

		router.map(routes, {
			home() {
				const user = getUser();
				expect(user).toEqual({ name: 'alice' });
				return new Response('Home');
			},
		});

		await router.fetch('https://example.com');
	});

	it('throws when called outside async context', () => {
		expect(() => getContext()).toThrow('no request context found');
	});
});
