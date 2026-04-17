export type Assert<T extends true> = T;

export type IsEqual<A, B> =
	// oxlint-disable-next-line typescript-eslint/no-unnecessary-type-parameters -- exact-equality trick requires generic functions to defer resolution
	(<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;

export type Simplify<T> = { [K in keyof T]: T[K] } & {};
