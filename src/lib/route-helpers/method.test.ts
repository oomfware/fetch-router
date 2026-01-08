import { describe, expect, it } from 'bun:test';

import { RoutePattern } from '@remix-run/route-pattern';

import { Route, createRoutes as route } from '../route-map.ts';

import {
	createDeleteRoute as del,
	createGetRoute as get,
	createHeadRoute as head,
	createOptionsRoute as options,
	createPatchRoute as patch,
	createPostRoute as post,
	createPutRoute as put,
} from './method.ts';

describe('route helpers composition', () => {
	it('composes route helpers in a route map', () => {
		let routes = route({
			home: '/',
			posts: {
				index: get('/posts'),
				create: post('/posts'),
				show: get('/posts/:id'),
				update: put('/posts/:id'),
				patch: patch('/posts/:id'),
				destroy: del('/posts/:id'),
			},
			api: {
				health: head('/api/health'),
				options: options('/api/settings'),
			},
		});

		expect(routes.home).toEqual(new Route('ANY', '/'));
		expect(routes.posts.index).toEqual(new Route('GET', '/posts'));
		expect(routes.posts.create).toEqual(new Route('POST', '/posts'));
		expect(routes.posts.show).toEqual(new Route('GET', '/posts/:id'));
		expect(routes.posts.update).toEqual(new Route('PUT', '/posts/:id'));
		expect(routes.posts.patch).toEqual(new Route('PATCH', '/posts/:id'));
		expect(routes.posts.destroy).toEqual(new Route('DELETE', '/posts/:id'));
		expect(routes.api.health).toEqual(new Route('HEAD', '/api/health'));
		expect(routes.api.options).toEqual(new Route('OPTIONS', '/api/settings'));
	});

	it('composes route helpers with base paths', () => {
		let apiRoutes = route('api/v1', {
			users: {
				index: get('/'),
				create: post('/'),
				show: get('/:id'),
				update: put('/:id'),
				destroy: del('/:id'),
			},
		});

		let routes = route({
			home: '/',
			api: apiRoutes,
		});

		expect(routes.api.users.index).toEqual(new Route('GET', '/api/v1'));
		expect(routes.api.users.create).toEqual(new Route('POST', '/api/v1'));
		expect(routes.api.users.show).toEqual(new Route('GET', '/api/v1/:id'));
		expect(routes.api.users.update).toEqual(new Route('PUT', '/api/v1/:id'));
		expect(routes.api.users.destroy).toEqual(new Route('DELETE', '/api/v1/:id'));
	});

	it('mixes helper methods with string patterns', () => {
		let routes = route({
			home: '/',
			about: '/about',
			contact: get('/contact'),
			login: post('/auth/login'),
			logout: del('/auth/logout'),
			profile: {
				show: '/profile',
				edit: get('/profile/edit'),
				update: patch('/profile'),
			},
		});

		expect(routes.home).toEqual(new Route('ANY', '/'));
		expect(routes.about).toEqual(new Route('ANY', '/about'));
		expect(routes.contact).toEqual(new Route('GET', '/contact'));
		expect(routes.login).toEqual(new Route('POST', '/auth/login'));
		expect(routes.logout).toEqual(new Route('DELETE', '/auth/logout'));
		expect(routes.profile.show).toEqual(new Route('ANY', '/profile'));
		expect(routes.profile.edit).toEqual(new Route('GET', '/profile/edit'));
		expect(routes.profile.update).toEqual(new Route('PATCH', '/profile'));
	});

	it('uses helper methods with complex patterns', () => {
		let routes = route({
			api: {
				posts: get('/api/posts(/:lang)'),
				createPost: post('/api/posts'),
				updatePost: put('/api/posts/:id'),
				deletePost: del('/api/posts/:id'),
			},
			healthCheck: head('/health'),
		});

		expect(routes.api.posts).toEqual(new Route('GET', '/api/posts(/:lang)'));
		expect(routes.api.createPost).toEqual(new Route('POST', '/api/posts'));
		expect(routes.api.updatePost).toEqual(new Route('PUT', '/api/posts/:id'));
		expect(routes.api.deletePost).toEqual(new Route('DELETE', '/api/posts/:id'));
		expect(routes.healthCheck).toEqual(new Route('HEAD', '/health'));
	});

	it('works with RoutePattern instances', () => {
		let routes = route({
			patch: patch(new RoutePattern('/patch')),
			put: put(new RoutePattern('/misc/put')),
		});

		expect(routes.patch).toEqual(new Route('PATCH', '/patch'));
		expect(routes.put).toEqual(new Route('PUT', '/misc/put'));
	});
});
