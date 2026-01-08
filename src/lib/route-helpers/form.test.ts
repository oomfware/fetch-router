import { describe, expect, it } from 'bun:test';

import { createRoutes as route, Route } from '../route-map.ts';

import { createFormRoutes as form } from './form.ts';

describe('form routes helper', () => {
	it('creates a route map with index and action routes', () => {
		let login = form('login');

		expect(login.index).toEqual(new Route('GET', '/login'));
		expect(login.action).toEqual(new Route('POST', '/login'));
	});

	it('supports a custom form method', () => {
		let settings = form('settings', { formMethod: 'PUT' });

		expect(settings.index).toEqual(new Route('GET', '/settings'));
		expect(settings.action).toEqual(new Route('PUT', '/settings'));
	});

	it('supports a custom index name', () => {
		let profile = form('profile', { names: { index: 'show' } });

		expect(profile.show).toEqual(new Route('GET', '/profile'));
		expect(profile.action).toEqual(new Route('POST', '/profile'));
	});

	it('supports a custom action name', () => {
		let signup = form('signup', { names: { action: 'register' } });

		expect(signup.index).toEqual(new Route('GET', '/signup'));
		expect(signup.register).toEqual(new Route('POST', '/signup'));
	});

	it('supports custom names for both index and action', () => {
		let contact = form('contact', {
			names: {
				index: 'show',
				action: 'submit',
			},
		});

		expect(contact.show).toEqual(new Route('GET', '/contact'));
		expect(contact.submit).toEqual(new Route('POST', '/contact'));
	});

	it('supports custom names with custom form method', () => {
		let account = form('account', {
			formMethod: 'PATCH',
			names: {
				index: 'edit',
				action: 'update',
			},
		});

		expect(account.edit).toEqual(new Route('GET', '/account'));
		expect(account.update).toEqual(new Route('PATCH', '/account'));
	});

	it('creates nested forms', () => {
		let routes = route({
			account: {
				...form('account'),
				settings: form('account/settings'),
			},
		});

		expect(routes.account.index).toEqual(new Route('GET', '/account'));
		expect(routes.account.action).toEqual(new Route('POST', '/account'));

		expect(routes.account.settings.index).toEqual(new Route('GET', '/account/settings'));
		expect(routes.account.settings.action).toEqual(new Route('POST', '/account/settings'));
	});
});
