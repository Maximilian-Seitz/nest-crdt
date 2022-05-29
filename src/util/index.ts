
export function assertIsFunction<T>(
	o: T,
	lazyMessage: () => string
): asserts o is T & ((...args: unknown[]) => unknown) {
	if (!isFunction(o)) {
		throw new Error(lazyMessage())
	}
}

export function isFunction<T>(o: T): o is T & ((...args: unknown[]) => unknown) {
	return typeof o === 'function'
}

export function isPromise<T>(o: T): o is T & Promise<any> {
	return o && typeof o === 'object' && o.hasOwnProperty('then') && isFunction(o['then'])
}

export function mapObject<T, R>(
	o: T,
	map: (value: T[keyof T]) => R
): {
	[Key in keyof T]: R
} {
	const mappedObj: any = {}

	const objKeys: Array<keyof T> = <any[]> Object.keys(o)
	objKeys.forEach(<Key extends keyof T>(key: Key) => {
		const value: T[Key] = o[key]
		mappedObj[key] = map(value)
	})

	return mappedObj
}

export type ValueIn<T> = T[keyof T]
