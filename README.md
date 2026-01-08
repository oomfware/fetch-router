# @oomfware/fetch-router

composable web router.

```sh
npm install @oomfware/fetch-router
```

## usage

the router maps incoming requests to handlers. it uses standard `Request`/`Response` objects.

```ts
import { createRouter, route } from '@oomfware/fetch-router';

// route() creates a "route map" that organizes routes by name
const routes = route({
	home: '/',
	about: '/about',
	blog: {
		index: '/blog',
		show: '/blog/:slug',
	},
});

const router = createRouter();

// map routes to a "controller" that defines actions for each route
router.map(routes, {
	home() {
		return new Response('Home');
	},
	about() {
		return new Response('About');
	},
	blog: {
		index() {
			return new Response('Blog');
		},
		show({ params }) {
			// params is a type-safe object with parameters from the route pattern
			return new Response(`Post ${params.slug}`);
		},
	},
});

const response = await router.fetch('https://example.com/blog/hello-world');
console.log(await response.text()); // "Post hello-world"
```

### request context

every action and middleware receives a context object:

```ts
router.get('/posts/:id', ({ request, signal, method, url, params, store }) => {
	// request: the original Request object
	console.log(request.headers.get('Accept'));

	// signal: the request's AbortSignal for cancellation
	console.log(signal.aborted);

	// method: the HTTP method
	console.log(method); // "GET"

	// url: parsed URL object
	console.log(url.pathname); // "/posts/123"
	console.log(url.searchParams.get('sort'));

	// params: route parameters (fully typed!)
	console.log(params.id); // "123"

	// store: typed key-value store for sharing data between middleware
	const user = store.inject(userKey);

	return new Response(`Post ${params.id}`);
});
```

### context store

the context store allows middleware to share typed values with handlers. create injection keys with
`createInjectionKey`:

```ts
import { createInjectionKey, type RouterMiddleware } from '@oomfware/fetch-router';

// create typed keys - with or without default values
const userKey = createInjectionKey<User>(); // User | undefined
const themeKey = createInjectionKey('light'); // string with default

// middleware provides values
function auth(): RouterMiddleware {
	return async (context, next) => {
		const user = await validateToken(context.request.headers.get('Authorization'));
		context.store.provide(userKey, user);
		return next(context);
	};
}

// handlers inject values
router.get('/profile', ({ store }) => {
	const user = store.inject(userKey); // User | undefined
	const theme = store.inject(themeKey); // 'light' (default)
	return Response.json({ user, theme });
});
```

### async context

the `asyncContext` middleware stores the request context in `AsyncLocalStorage`, making it
accessible from any function in the call stack without explicitly passing it:

```ts
import { createInjectionKey } from '@oomfware/fetch-router';
import { asyncContext, getContext } from '@oomfware/fetch-router/middlewares/async-context';

const userKey = createInjectionKey<User>();

const router = createRouter({
	middleware: [asyncContext()],
});

// access context from anywhere - no need to pass it through
function getCurrentUser(): User | undefined {
	return getContext().store.inject(userKey);
}

async function savePost(title: string) {
	const user = getCurrentUser();
	// ...
}

router.post('/posts', async () => {
	await savePost('Hello World');
	return new Response('Created', { status: 201 });
});
```

> [!NOTE]  
> requires `node:async_hooks` support.

### routing by method

routes can be registered for specific HTTP methods:

```ts
const routes = route({
	home: { method: 'GET', pattern: '/' },
	contact: {
		index: { method: 'GET', pattern: '/contact' },
		action: { method: 'POST', pattern: '/contact' },
	},
});

// or use method-specific helpers
router.get(routes.home, () => new Response('Home'));
router.post(routes.contact.action, ({ request }) => {
	// handle form submission
	return new Response('Thanks!');
});
```

### route helpers

#### form routes

the `form()` helper creates routes for showing a form and handling its submission:

```ts
import { createRouter, form, route } from '@oomfware/fetch-router';

const routes = route({
	home: '/',
	contact: form('contact'),
});

// routes.contact.index: Route<'GET', '/contact'>
// routes.contact.action: Route<'POST', '/contact'>

router.map(routes, {
	home() {
		return new Response('Home');
	},
	contact: {
		index() {
			return new Response('Contact form');
		},
		action({ request }) {
			// handle form submission
			return new Response('Message sent!');
		},
	},
});
```

#### resource routes

the `resources()` helper creates RESTful routes for a collection:

```ts
import { createRouter, resources, route } from '@oomfware/fetch-router';

const routes = route({
	users: resources('users'),
});

// routes.users.index: Route<'GET', '/users'>
// routes.users.new: Route<'GET', '/users/new'>
// routes.users.show: Route<'GET', '/users/:id'>
// routes.users.create: Route<'POST', '/users'>
// routes.users.edit: Route<'GET', '/users/:id/edit'>
// routes.users.update: Route<'PUT', '/users/:id'>
// routes.users.destroy: Route<'DELETE', '/users/:id'>
```

use the `only` or `exclude` options to limit which routes are generated:

```ts
const routes = route({
	users: resources('users', { only: ['index', 'show'] }),
	posts: resources('posts', { exclude: ['destroy'] }),
});
```

the `resource()` helper creates routes for a singleton resource:

```ts
import { resource } from '@oomfware/fetch-router';

const routes = route({
	profile: resource('profile', { only: ['show', 'edit', 'update'] }),
});

// routes.profile.show: Route<'GET', '/profile'>
// routes.profile.edit: Route<'GET', '/profile/edit'>
// routes.profile.update: Route<'PUT', '/profile'>
```

### middleware

middleware functions run before and/or after actions:

```ts
import type { RouterMiddleware } from '@oomfware/fetch-router';

function logger(): RouterMiddleware {
	return async (context, next) => {
		const start = Date.now();
		const response = await next(context);
		const duration = Date.now() - start;
		console.log(`${context.method} ${context.url.pathname} ${response.status} ${duration}ms`);
		return response;
	};
}

// global middleware runs on all requests
const router = createRouter({
	middleware: [logger()],
});
```

#### controller middleware

middleware can be applied to a controller, where it runs for all nested actions. this is useful for
applying authentication or other shared logic to a group of routes:

```ts
const routes = route({
	account: {
		profile: resource('account', { only: ['show', 'edit', 'update'] }),
		password: form('account/password'),
	},
});

router.map(routes, {
	account: {
		middleware: [requireAuth()],
		actions: {
			// all actions below require authentication
			profile: {
				show() { /* ... */ },
				edit() { /* ... */ },
				update() { /* ... */ },
			},
			password: {
				index() { /* ... */ },
				action() { /* ... */ },
			},
		},
	},
});
```

nested controllers can add their own middleware, which merges with the parent's:

```ts
router.map(routes, {
	account: {
		middleware: [requireAuth()],
		actions: {
			profile: { /* ... */ },
			password: {
				// password actions get requireAuth() AND rateLimit()
				middleware: [rateLimit()],
				actions: {
					index() { /* ... */ },
					action() { /* ... */ },
				},
			},
		},
	},
});
```

#### per-action middleware

individual actions can also have their own middleware for cases where only one route needs special
handling:

```ts
router.map(routes, {
	users: {
		middleware: [requireAuth()],
		actions: {
			index() { /* ... */ },
			show({ params }) { /* ... */ },
			destroy: {
				// only destroy gets audit logging
				middleware: [auditLog()],
				action({ params }) { /* ... */ },
			},
		},
	},
});
```

### generating URLs

routes have an `href()` method for generating URLs:

```ts
const routes = route({
	users: resources('users'),
});

// generate URLs with type-safe parameters
const userUrl = routes.users.show.href({ id: '123' }); // "/users/123"
const editUrl = routes.users.edit.href({ id: '123' }); // "/users/123/edit"
```
