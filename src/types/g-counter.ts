import { Type } from "../Type"

export const GCounter: Type<number, number, number, {
	increment(): number
}> = {
	first: () => 0,
	reduce: (message: number, previous, changed) => {
		changed({ type: 'increment', by: message })
		return message + previous || 0
	},
	valueOf: (state) => state,
	mutators: {
		increment: () => 1
	}
}
