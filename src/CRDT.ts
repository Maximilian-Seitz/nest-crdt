import { Mutators, Type } from "./Type"
import { EventEmitter } from "events"
import { assertIsFunction, isFunction, mapObject } from "./util"

/**
 * Unique symbol to internally mark a CRDT as such.
 * Cannot be shared between nodes (even using the same code-base).
 */
const CRDT_MARKER: unique symbol = Symbol('CRDT_MARKER')


export type CRDT<State, Message, Value, MutatorsType extends Mutators<State, Message>> = {
	/**
	 * Marker used to uniquely identify this as a CRDT, allowing for some type-safe operations.
	 */
	[Marker in typeof CRDT_MARKER]: true
} & {
	/**
	 * Unique identifier for this CRDT, used to reference it.
	 */
	readonly id: string

	/**
	 * Name of the type of CRDT this instantiates. This type defines the behavior of the CRDT,
	 * and the name is used to mirror this CRDT on other nodes.
	 */
	readonly typeName: string

	/**
	 * Evaluates the CRDT in it's current state. This value is eventually consistent
	 * with copies of this CRDT on other nodes, but may vary from their current states.
	 * Should not be used when storing a CRDT within another CRDT, as this will remove
	 * it's ability to become consistent.
	 * Instead of storing the value of a CRDT, the CRDT itself should be stored.
	 * @returns The value the CRDT currently possesses
	 */
	value(): Value
	
	/**
	 * Adds event listener for changes happening in the CRDT.
	 */
	on(event: 'change' | 'deep change', listener: (...args: any[]) => void)
	
} & {
	[MutatorName in keyof MutatorsType]: (...args: Parameters<MutatorsType[MutatorName]>) => Promise<void>
}

/**
 * Check if a value is a CRDT
 * @param o
 */
export function isCRDT(o: any): o is CRDT<any, any, any, any> {
	return !!o
		&& (typeof o === 'object')
		//&& o.hasOwnProperty(CRDT_MARKER)
		&& !!o[CRDT_MARKER]
}


/**
 * Reference to a CRDT, which can be shared between nodes.
 * Contains the type, which defines the behavior,
 * and an ID used to uniquely reference the CRDT.
 *
 * The referenced CRDT may not exist in a node.
 * In this case it will simply be created, and stored.
 */
export interface CRDTReference {
	CRDTType: string
	CRDTId: string
}

/**
 * Check if a value is a reference to a CRDT.
 * @param o
 */
export function isCRDTReference(o: any): o is CRDTReference {
	return !!o
		&& (typeof o === 'object')
		// && o.hasOwnProperty('CRDTType')
		&& typeof o['CRDTType'] === 'string'
		// && o.hasOwnProperty('CRDTId')
		&& typeof o['CRDTId'] === 'string'
}

/**
 * Turns a reference to a CRDT into the referenced CRDT,
 * given the context containing the definition of the type,
 * the cache of CRDTs, and the message handler responsible.
 * @param ref Reference to CRDT
 * @param messageHandler Message handler to manage created CRDT
 * @param typeStore Type store containing type definition for CRDT
 * @param cache Cache holding previously created CRDTs
 */
export function createFromReference(
	ref: CRDTReference,
	messageHandler: MessageHandler,
	typeStore: Record<string, Type<any, any, any, any>>,
	cache: Map<string, CRDT<any, any, any, any>>
): CRDT<any, any, any, any> {
	return create(ref.CRDTId, ref.CRDTType, messageHandler, typeStore, cache)
}


/**
 * A <code>MessageHandler</code> is responsible for ensuring that messages
 * get delivered to every copy of the CRDT in the network eventually.
 * This includes CRDTs that haven't yet been accessed locally,
 * and thus don't exist in the cache associated with this set of CRDTs.
 */
export interface MessageHandler {
	/**
	 * Send a message to target at every node (eventually).
	 * @param target Reference to the CRDT being messaged
	 * @param msg Serializable data to send
	 */
	sendMessageTo(target: CRDTReference, msg: any): Promise<void>

	/**
	 * Register function to trigger when message was received for a certain target.
	 * This receiver must also eventually be triggered when a message has been sent by this node.
	 * @param target Reference to the CRDT this receiver handles
	 * @param handleMessage Function to call when a message was received
	 */
	addReceiverFor(target: CRDTReference, handleMessage: (message: any) => void): void
}


export type CRDTDefinedBy<T> = T extends Type<infer State, infer Message, infer Value, infer MutatorsType>
	? CRDT<State, Message, Value, MutatorsType>
	: never


/**
 * Creates a CRDT, or returns a previously created instance.
 * The created CRDT will have the behavior of a type in the
 * used <code>typeStore</code>.
 * @param id ID of the CRDT to uniquely identify it
 * @param typeName String representing the behavior of the CRDT
 * @param messageHandler Message handler to manage created CRDT
 * @param typeStore Type store containing type definition for CRDT
 * @param cache Cache holding previously created CRDTs
 */
export function create<TypeStore, TypeName extends (keyof TypeStore) & string>(
	id: string,
	typeName: TypeName,
	messageHandler: MessageHandler,
	typeStore: TypeStore,
	cache: Map<string, CRDT<any, any, any, any>>
): CRDTDefinedBy<TypeStore[TypeName]> {
	// If the cache already has this CRDT return the cached version.
	if (cache.has(id)) {
		return <any>cache.get(id)
	}

	const {
		first,
		reduce,
		valueOf,
		mutators
	} = <Type<any, any, any, any>><unknown>typeStore[typeName]

	/**
	 * Internal state; is updated any time a new message is inserted.
	 */
	let state = first()

	/**
	 * Changes to emit to any change listeners.
	 */
	let changesToEmit: Array<any> = []
	
	/**
	 * new EventEmitter()
	 */
	const eventEmitter: EventEmitter = new EventEmitter()
	eventEmitter.setMaxListeners(Infinity)
	

	const crdtReference: CRDTReference = {
		CRDTId: id,
		CRDTType: typeName
	}

	messageHandler.addReceiverFor(crdtReference, message => {
		insert(deserializeReferences(message))
	})

	const crdt: CRDTDefinedBy<TypeStore[TypeName]> = <any> Object.assign(
		// Add the marker to the CRDT
		newCRDTBase(),

		// Readonly members
		Object.freeze({
			id,
			typeName,
			
			value: () => valueOf(state),
			
			on(event: 'change' | 'deep change', listener: (...args: any[]) => void) {
				eventEmitter.on(event, listener)
			}
		}),

		// Mutable members
		{

		},

		// Mutators the CRDT should have
		mapObject(
			mutators,
			mutatorFor
		)
	)

	cache.set(id, crdt)
	return crdt


	/**
	 * Creates a wrapper for the mutator functions,
	 * which handles transfer of the produced messages,
	 * resolves the messages
	 * @param mutator
	 */
	function mutatorFor(
			mutator: (...args: unknown[]) => unknown
	): (...args) => Promise<void> {
		assertIsFunction(mutator, () => "Mutator must be a function!")

		return async (...args) => {
			const message = mutator.apply(state, args)

			const messages: Array<any> = []

			if (message !== undefined) {
				if (isFunction(message)) {
					let hasNext: boolean

					do {
						hasNext = false

						let result = await message()

						if (Array.isArray(result)) {
							hasNext = !result[1]
							messages.push(result[0])
						}
					} while (hasNext)
				} else {
					messages.push(message)
				}
			}

			for (const msg of messages) {
				await messageHandler.sendMessageTo(
					crdtReference,
					serializeToReferences(msg)
				)
			}
		}
	}

	/**
	 * Takes a serializable value possibly containing CRDTs
	 * and returns the same value with any CRDTs turned into
	 * CRDT references.
	 * @param o Any serializable value possibly containing CRDTs
	 * @returns The value with any CRDTs turned into references
	 */
	function serializeToReferences(o) {
		// JSON.stringify and JSON.parse are used here,
		// since they know any possible serialization
		// possible in JS, so none will be missed.

		const serializedValue = JSON.stringify(o, (key, value) => {
			if (isCRDT(value)) {
				return toCRDTReference(value)
			} else {
				return value
			}
		})

		return JSON.parse(serializedValue)
	}

	/**
	 * Takes a serializable value possibly containing references
	 * to CRDTs, and returns the same value with any references
	 * turned into the respective CRDTs.
	 * @param o Any serializable value possibly containing CRDT references
	 * @returns The value with any CRDT references turned into CRDTs
	 */
	function deserializeReferences(o) {
		// JSON.stringify and JSON.parse are used here,
		// since they know any possible serialization
		// possible in JS, so none will be missed.

		return JSON.parse(
			JSON.stringify(o),
			(key, value) => {
				if (isCRDTReference(value)) {
					return toCRDT(value)
				} else {
					return value
				}
			}
		)
	}

	/**
	 * Turns a CRDT into a serializable reference which can be used
	 * to create this CRDT in another node, so long as the same
	 * environment is provided on the remove node
	 * (the same type must be present on the remote node).
	 * @param crdt The CRDT to create a reference for
	 * @returns A reference which can be used to construct the input CRDT
	 */
	function toCRDTReference(crdt: CRDT<any, any, any, any>): CRDTReference {
		return {
			CRDTId: crdt.id,
			CRDTType: crdt.typeName
		}
	}

	/**
	 * Turns a reference to a CRDT into that CRDT and adds the required
	 * listeners to that CRDT to report on deep changes.
	 * If it's previously been instantiated the cached version will be returned,
	 * otherwise a new CRDT will be created.
	 * @param value The reference to the CRDT being created
	 */
	function toCRDT(value: CRDTReference): CRDT<unknown, unknown, unknown, Mutators<unknown, unknown>> {
		const {
			CRDTId: newId,
			CRDTType: newType
		} = value

		if (typeStore.hasOwnProperty(newType)) {
			let newCRDT = create(
				newId,
				newType as string & keyof typeof typeStore,
				messageHandler,
				typeStore,
				cache
			)

			newCRDT.on('change', () => eventEmitter.emit('deep change'))
			newCRDT.on('deep change', () => eventEmitter.emit('deep change'))

			return newCRDT
		} else {
			throw new Error("Fatal error: Unknown type of CRDT being initialized!")
		}
	}

	/**
	 * Applies a message to the current state of the CRDT,
	 * producing a new state to replace the old one.
	 * @param message New message to apply
	 */
	function insert(message): void {
		state = reduce(message, state, (e) => changesToEmit.push(e))

		const changes = changesToEmit
		changesToEmit = []

		changes.forEach((change) => {
			eventEmitter.emit('change', change)
		})
	}
}

/**
 * Returns a new object that has a particular marker identifying it as a CRDT.
 * This value isn't a CRDT on it's own, but must be used as a base for any CRDTs.
 */
function newCRDTBase(): {
	[Marker in typeof CRDT_MARKER]: true
} {
	const base: any = {}
	base[CRDT_MARKER] = true
	return base
}
