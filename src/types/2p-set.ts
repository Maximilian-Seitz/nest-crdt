import { GSet } from "./g-set"

import { Type } from "../Type"

export const TwoPSet: Type<
	[Set<any>, Set<any>],
	[any, any],
	Set<any>,
	{
		add(elem: any): [any, null]
		remove(elem: any): [null, any]
	}
> = {
	first: () => [GSet.first(), GSet.first()],
	reduce: (message, previous, changed) => {
		return [
			GSet.reduce(message[0], previous[0], (event) => {
				changed({ type: 'add', value: event.value })
			}),
			GSet.reduce(message[1], previous[1], (event) => {
				changed({ type: 'remove', value: event.value })
			})
		]
	},
	valueOf(state) {
		const tombstones = state[1]
		return new Set(Array.from(state[0]).filter((entry) => !tombstones.has(entry)))
	},
	mutators: {
		add: (elem: any) => [GSet.mutators.add.apply(this, elem), null],
		remove: (elem) => [null, GSet.mutators.add.apply(this, elem)]
	}
}
