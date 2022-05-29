# Nested CRDTs

This project allows creation of CRDTs with nesting.
For these CRDTs ether custom behavior or provided behavior can be used.


## Usage

Use the `create` function to create a CRDT.
This requires an `id` and a `typeName`,
which will uniquely identify this CRDT over the network.
The `typeName` will also dictate the behavior of this CRDT,
and must be a key in the `typeStore`,
which holds all possible behaviors known in the network.
Any child of this CRDT, or any other CRDT interacting with this one,
must have the same `typeStore`, `messageHandler` and `cache`.
The `messageHandler` is responsible for distributing messages
to all CRDTs in this network, and the `cache` holds every CRDT
previously mentioned in the system, for later storage.
The `cache` is expected to be empty at first, when no CRDTs
are associated with it yet.

A default `typeStore` can be imported (called `defaultTypes`),
and extended with custom types, if needed.
It is also possible, however, to forgo these default types,
and only use custom ones.

```typescript
import { create, MessageHandler, defaultTypes } from "nest-crdt"

// MessageHandler must be implemented
const messageHandler: MessageHandler = /* see next section */ undefined as any

// Expected to be empty at first
const cache = new Map()

const syncedSet = create('syncedSet', 'g-set', messageHandler, defaultTypes, cache)

// The 'add' method is a modifier specified for 'g-set' in 'defaultTypes',
// and can therefore be used type-safely here.
syncedSet.add("Text to be added to set.").then(() => {
    // The Promise being resolved doesn't imply that the message
    // has been accepted by every node in the network,
    // only that the sending process has been initiated.
    console.log("Added text to 'syncedSet'!")
})
```


## Message Handler

The `messageHandler` is responsible for ensuring that messages
get delivered to CRDTs, even if they haven't yet been accessed locally,
and thus don't exist in the `cache`.

In order to make sure messages get delivered consistently, however,
it may instantiate the target CRDT, once a message arrives for it,
adding it to the `cache`, and deliver the message to it.

An implementation of this strategy can be found in the `nest-crdt-tools`
module, in the `CachedMessageHandler` class.


## Building

To build this project first run `npm install` to install the node libraries,
then run `npm run build`, to invoke the TypeScript compiler.
