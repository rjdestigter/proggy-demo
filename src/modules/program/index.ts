// Utils
import { Value as reExportValue } from './Program'

export { getStack, Program, Program as default, andThen, combine, create, mapOnce, isPromise, delay } from './Program'

export type Value<A> = reExportValue<A>
