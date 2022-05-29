import { Type } from "../Type"

export const LWWRegister: Type<
	[Map<number, any>, Map<any, any>],
	[number, any, any],
	Map<any, any>,
	{
		set(key: any, value: any): [number, any, any]
	}
> = {
	first: () => [new Map(), new Map()],
	reduce: (message: [number, any, any], state, changed) => {
		const [timestamps, values] = state
		const [timestamp, key, value] = message
		const previousTimestamp = timestamps.get(key)
		if (previousTimestamp && previousTimestamp === timestamp) {
			// same timestamp: we have to untie this by choosing the highest value
			const previousValue = values.get(key)
			const prevailingValue = [value, previousValue].sort()[1]
			const replace = prevailingValue === value
			if (replace) {
				timestamps.set(key, timestamp)
				values.set(key, value)
			}
			return state
		}
		const replace = !previousTimestamp || (previousTimestamp < timestamp)
		if (replace) {
			timestamps.set(key, timestamp)
			values.set(key, value)
			changed({ type: 'set', key: key, value: value })
		}
		return state
	},

	valueOf: (state) => {
		const values = state[1]
		return new Map([...values])
	},

	mutators: {
		set: (key, value) => [timestamp(), key, value]
	}
}

function timestamp(): number {
	return Date.now()
}
