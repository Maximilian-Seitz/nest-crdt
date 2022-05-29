import { GCounter } from "./types/g-counter"
import { PNCounter } from "./types/pn-counter"
import { GSet } from "./types/g-set"
import { TwoPSet } from "./types/2p-set"
import { LWWSet } from "./types/lww-set"
import { ORSet } from "./types/or-set"
import { LWWRegister } from "./types/lww-register"
import { MVRegister } from "./types/mv-register"

export const defaultTypes = {
	'g-counter': GCounter,
	'pn-counter': PNCounter,
	'g-set': GSet,
	'2p-set': TwoPSet,
	'lww-set': LWWSet,
	'or-set': ORSet,
	'lww-register': LWWRegister,
	'mv-register': MVRegister
} as const
