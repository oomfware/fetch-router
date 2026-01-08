import { describe, expect, it } from 'bun:test';

import { Route, createRoutes as route } from './route-map.ts';

describe('createRoutes', () => {
	it('creates a route map', () => {
		let routes = route({
			home: '/',
			about: {
				index: 'about',
				company: 'about/company',
			},
		});

		expect(routes.home).toEqual(new Route('ANY', '/'));
		expect(routes.about.index).toEqual(new Route('ANY', '/about'));
		expect(routes.about.company).toEqual(new Route('ANY', '/about/company'));
	});

	it('creates a route map with a base', () => {
		let routes = route('categories', {
			index: '/',
			new: '/new',
			show: '/:slug',
			edit: '/:slug/edit',
		});

		expect(routes.index).toEqual(new Route('ANY', '/categories'));
		expect(routes.new).toEqual(new Route('ANY', '/categories/new'));
		expect(routes.show).toEqual(new Route('ANY', '/categories/:slug'));
		expect(routes.edit).toEqual(new Route('ANY', '/categories/:slug/edit'));
	});

	it('creates a route map with a nested route map', () => {
		let categoriesRoutes = route('categories', {
			index: '/',
			new: '/new',
			show: '/:slug',
			edit: '/:slug/edit',
		});

		let routes = route({
			home: '/',
			about: '/about',
			// nested route map
			categories: categoriesRoutes,
		});

		expect(routes.home).toEqual(new Route('ANY', '/'));
		expect(routes.about).toEqual(new Route('ANY', '/about'));
		expect(routes.categories.index).toEqual(new Route('ANY', '/categories'));
		expect(routes.categories.new).toEqual(new Route('ANY', '/categories/new'));
		expect(routes.categories.show).toEqual(new Route('ANY', '/categories/:slug'));
		expect(routes.categories.edit).toEqual(new Route('ANY', '/categories/:slug/edit'));
	});

	it('creates nested routes using object spread syntax', () => {
		let routes = route({
			home: '/',
			...route('posts', {
				posts: '/',
				editPost: '/:slug/edit',
			}),
		});

		expect(routes.home).toEqual(new Route('ANY', '/'));
		expect(routes.posts).toEqual(new Route('ANY', '/posts'));
		expect(routes.editPost).toEqual(new Route('ANY', '/posts/:slug/edit'));
	});
});
