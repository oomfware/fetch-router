import { describe, expect, it } from 'bun:test';

import { composeMiddleware, type Middleware } from './middleware.ts';

type StringMiddleware = Middleware<[string], Promise<string>>;
type NumberMiddleware = Middleware<[number], Promise<number>>;
type MultiMiddleware = Middleware<[string, number], Promise<string>>;

describe('composeMiddleware', () => {
	it('composes middlewares into a single function', async () => {
		let log: string[] = [];

		let m1: StringMiddleware = (input, next) => {
			log.push(`m1: ${input}`);
			return next(input);
		};
		let m2: StringMiddleware = (input, next) => {
			log.push(`m2: ${input}`);
			return next(input);
		};
		let handler: StringMiddleware = (input) => {
			log.push(`handler: ${input}`);
			return Promise.resolve(`result: ${input}`);
		};

		let run = composeMiddleware([m1, m2, handler]);
		let result = await run('test');

		expect(result).toBe('result: test');
		expect(log).toEqual(['m1: test', 'm2: test', 'handler: test']);
	});

	it('allows middleware to short-circuit the chain', async () => {
		let log: string[] = [];

		let m1: StringMiddleware = (input, next) => {
			log.push(`m1: ${input}`);
			return next(input);
		};
		let m2: StringMiddleware = (input) => {
			log.push(`m2-short-circuit: ${input}`);
			return Promise.resolve('blocked');
		};
		let m3: StringMiddleware = (input, next) => {
			log.push(`m3: ${input}`);
			return next(input);
		};
		let handler: StringMiddleware = (input) => {
			log.push(`handler: ${input}`);
			return Promise.resolve(`result: ${input}`);
		};

		let run = composeMiddleware([m1, m2, m3, handler]);
		let result = await run('test');

		expect(result).toBe('blocked');
		expect(log).toEqual(['m1: test', 'm2-short-circuit: test']);
	});

	it('allows middleware to transform the input', async () => {
		let m1: NumberMiddleware = (n, next) => next(n + 1);
		let m2: NumberMiddleware = (n, next) => next(n * 2);
		let handler: NumberMiddleware = (n) => Promise.resolve(n);

		let run = composeMiddleware([m1, m2, handler]);
		let result = await run(5);

		// (5 + 1) * 2 = 12
		expect(result).toBe(12);
	});

	it('propagates errors thrown in middleware', () => {
		let m1: StringMiddleware = () => {
			throw new Error('middleware error');
		};
		let handler: StringMiddleware = (input) => Promise.resolve(input);

		let run = composeMiddleware([m1, handler]);

		expect(() => run('test')).toThrow('middleware error');
	});

	it('propagates errors thrown in handler', () => {
		let m1: StringMiddleware = (input, next) => next(input);
		let handler: StringMiddleware = () => {
			throw new Error('handler error');
		};

		let run = composeMiddleware([m1, handler]);

		expect(() => run('test')).toThrow('handler error');
	});

	it('allows middleware to catch errors from downstream', async () => {
		let m1: StringMiddleware = async (input, next) => {
			try {
				return await next(input);
			} catch (error) {
				return `caught: ${(error as Error).message}`;
			}
		};
		let handler: StringMiddleware = () => {
			throw new Error('downstream error');
		};

		let run = composeMiddleware([m1, handler]);
		let result = await run('test');

		expect(result).toBe('caught: downstream error');
	});

	it('works with multiple parameters', async () => {
		let m1: MultiMiddleware = (s, n, next) => next(s.toUpperCase(), n * 2);
		let handler: MultiMiddleware = (s, n) => Promise.resolve(`${s}-${n}`);

		let run = composeMiddleware([m1, handler]);
		let result = await run('hello', 5);

		expect(result).toBe('HELLO-10');
	});
});
