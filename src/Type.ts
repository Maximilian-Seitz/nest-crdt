
/**
 * Mutators associated with a name, as part of a CRDT.
 * Each mutator takes a state, and produces a message on how to change that state.
 */
export interface Mutators<State, Message> {
	[mutatorName: string]: Mutator<State, Message>
}

/**
 * Mutator to interact with the CRDT.
 * @returns A message to insert into the CRDT, or a message provider to produce such messages
 */
export type Mutator<State, Message> =
	(this: State, ...args) => (Message | MessageProvider<Message>)

/**
 * A function that produces a message, to insert into a CRDT,
 * every time it is called, as long as messages are still available.
 * Expects to be called until no messages remain.
 * @returns A tuple, or promise thereof, which contains a message, and a truthy value, if this was the last message
 */
export type MessageProvider<Message> =
	() => ([Message, boolean] | Promise<[Message, boolean]>)

export interface Type<State, Message, Value, MutatorsType extends Mutators<State, Message>> {
	/**
	 * Generates the initial state of this CRDT.
	 */
	first(): State

	/**
	 * Merges a message into the current state, to produce a new state.
	 * @param message Message to merge
	 * @param previous Previous state to use as a base
	 * @param changed Callback to report any changes to any change listeners on the CRDT
	 * @returns New state the CRDT will hold
	 */
	reduce(message: Message, previous: State, changed: (...args) => void): State

	/**
	 * Takes a state and produces the value the CRDT holds at the moment this state is valid.
	 * @param state Current state of the CRDT
	 * @returns Current value of the CRDT
	 */
	valueOf(state: State): Value

	/**
	 * Mutator functions used to modify the CRDT.
	 */
	mutators: MutatorsType
}
