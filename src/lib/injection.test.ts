import { describe, expect, it } from 'bun:test';

import { createContextStore, createInjectionKey } from './injection.ts';

describe('createInjectionKey', () => {
	it('creates a key with default value', () => {
		const key = createInjectionKey('default');
		expect(key.defaultValue).toBe('default');
	});

	it('creates a key without default value', () => {
		const key = createInjectionKey<string>();
		expect(key.defaultValue).toBeUndefined();
	});
});

describe('ContextStore', () => {
	it('provides and injects values', () => {
		const store = createContextStore();
		const userKey = createInjectionKey<{ name: string }>();

		store.provide(userKey, { name: 'alice' });
		const user = store.inject(userKey);

		expect(user).toEqual({ name: 'alice' });
	});

	it('returns default value when not provided', () => {
		const store = createContextStore();
		const themeKey = createInjectionKey('light');

		const theme = store.inject(themeKey);

		expect(theme).toBe('light');
	});

	it('returns undefined for key without default', () => {
		const store = createContextStore();
		const userKey = createInjectionKey<{ name: string }>();

		const user = store.inject(userKey);

		expect(user).toBeUndefined();
	});

	it('overwrites previously provided values', () => {
		const store = createContextStore();
		const countKey = createInjectionKey(0);

		store.provide(countKey, 1);
		store.provide(countKey, 2);

		expect(store.inject(countKey)).toBe(2);
	});

	it('keeps keys isolated', () => {
		const store = createContextStore();
		const key1 = createInjectionKey<string>();
		const key2 = createInjectionKey<string>();

		store.provide(key1, 'value1');
		store.provide(key2, 'value2');

		expect(store.inject(key1)).toBe('value1');
		expect(store.inject(key2)).toBe('value2');
	});
});
