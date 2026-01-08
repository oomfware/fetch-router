/**
 * a typed key for storing and retrieving values from the context store.
 */
export interface InjectionKey<T> {
	defaultValue: T;
}

/**
 * create an injection key with a default value.
 *
 * @param value the default value to use when no value has been provided
 * @returns a typed injection key
 */
export function createInjectionKey<T>(value: T): InjectionKey<T>;
/**
 * create an injection key without a default value.
 *
 * @returns a typed injection key where inject returns `T | undefined`
 */
export function createInjectionKey<T>(): InjectionKey<T | undefined>;
export function createInjectionKey<T>(value?: T): InjectionKey<T | undefined> {
	return { defaultValue: value };
}

/**
 * a store for sharing typed values between middleware and handlers.
 */
export interface ContextStore {
	/**
	 * provide a value for a given injection key.
	 *
	 * @param key the injection key
	 * @param value the value to store
	 */
	provide<T>(key: InjectionKey<T>, value: T): void;

	/**
	 * inject a value for a given injection key.
	 *
	 * @param key the injection key
	 * @returns the provided value, or the default value if none was provided
	 */
	inject<T>(key: InjectionKey<T>): T;
}

/**
 * create a new context store.
 *
 * @returns a new context store instance
 */
export function createContextStore(): ContextStore {
	const map = new Map<InjectionKey<unknown>, unknown>();

	return {
		provide<T>(key: InjectionKey<T>, value: T): void {
			map.set(key, value);
		},
		inject<T>(key: InjectionKey<T>): T {
			if (map.has(key)) {
				return map.get(key) as T;
			}
			return key.defaultValue;
		},
	};
}
