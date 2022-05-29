import { Type } from "../Type"

import { GCounter } from "./g-counter"

export const PNCounter: Type<
	[number, number],
	[number|null, number|null],
	number,
	{
		increment(): [number, null]
		decrement(): [null, number]
	}
	> = {
	first: () => [GCounter.first(), GCounter.first()],
	reduce: (message, previous, changed) => [
		GCounter.reduce(message[0], previous[0], changed),
		GCounter.reduce(message[1], previous[1], (event) => {
			changed({ type: 'decrement', by: event.by })
		})
	],
	valueOf: (state) => state[0] - state[1],
	mutators: {
		increment: () => [GCounter.mutators.increment(), null],
		decrement: () => [null, GCounter.mutators.increment()]
	}
}
