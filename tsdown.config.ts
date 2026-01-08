import { defineConfig } from 'tsdown';

export default defineConfig({
	entry: {
		index: 'src/index.ts',
		'middlewares/async-context': 'src/middlewares/async-context.ts',
	},
	exports: true,
});
