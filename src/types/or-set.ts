import { Type } from "../Type"

import { v4 as uuid } from "uuid"

export const ORSet: Type<
	[Map<string, any>, Set<any>],
	[[string, any]|null, string|null],
	Array<any>,
	{
		add(elem: any): [[string, any], null]
		remove(elem: any): [null, string]
	}
> = {
	first: () => [new Map(), new Set()],
	reduce: (message, previous, changed) => {
		const adds = new Map<string, any>([...previous[0]])
		const add = message[0]
		if (add) {
			const [tag, value] = add
			adds.set(value, tag)
			changed({ type: 'set', value: value, tag: tag })
		}

		const removes = new Set<any>([...previous[1]])
		const remove = message[1]
		if (remove) {
			removes.add(remove)
			changed({ type: 'remove', tag: remove })
		}

		return [adds, removes]
	},

	valueOf: (state) => {
		const adds = Array.from(state[0].entries())
		const removes = state[1]
		return adds
			.filter((add) => {
				const tag = add[1]
				return !removes.has(tag)
			})
			.map((add) => add[0])
	},

	mutators: {
		add: (elem) => [[uuid(), elem], null],
		remove (elem) {
			const state = this
			const adds = state[0]
			const tag = adds.get(elem)
			if (tag) {
				return [null, tag]
			}
		}
	}
}
