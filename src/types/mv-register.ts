import { Type } from "../Type"

import { v4 as uuid } from "uuid"
import * as vc from "vectorclock"

type VectorClock = any
type Value = any

export const MVRegister: Type<
	[string, Map<string, Array<[VectorClock, Value]>>],
	[VectorClock, string, Value],
	Map<string, Value>,
	{
		set(key: string, value: Value)
	}
> = {
	first(): [string, Map<string, Array<[VectorClock, Value]>>] {
		return [
			uuid(),                         // id
			new Map<string, Array<[VectorClock, Value]>>()   // values with VectorClocks
		]
	},
	
	reduce: (message, state, changed) => {
		const [clock, key, value] = message
		const values = state[1]
		let existingValues = values.get(key) || []
		
		let addable = true
		existingValues = existingValues
			.filter(([previousClock, previousValue]) => {
				if (vc.isConcurrent(clock, previousClock) && !vc.isIdentical(clock, previousClock)) {
					addable = true
					return true
				} else {
					// two values are not concurrent. Let's see which wins
					const result = vc.compare(previousClock, clock)
					if (result === -1) {
						// previous value happened before current one
						addable = true
						return false
					} else {
						// previous value happened after current one, it prevails
						addable = false
						return true
					}
				}
			})
		
		if (addable) {
			existingValues.push([clock, value])
		}
		
		values.set(key, existingValues)
		changed({ type: 'set', key, values: existingValues })
		
		return state
	},
	
	valueOf: (state) => {
		const values = state[1]
		const onlyValues: Array<[string, any]> =
			[...values].map(v =>
				[
					v[0],
					v[1].map(val => val[1])
				]
			)
		return new Map(onlyValues)
	},
	
	mutators: {
		set(key: string, value: any) {
			const [id, values] = this as [string, Map<string, Array<[VectorClock, any]>>]
			const existingValues = values.get(key) || []
			const clocks = existingValues.map((v) => v[0])
			let clock = clocks.reduce(vc.merge, {})
			clock = vc.increment(clock, id)
			return [clock, key, value]
		}
	}
}
