import { Lazy } from 'fp-ts/lib/function'
import { IO } from 'fp-ts/lib/IO'
import * as _ from 'lodash'

import 'requestidlecallback-polyfill'

export type Value<A> = Promise<A> | A

export const isPromise = <A>(value: Value<A>): value is Promise<A> => value instanceof Promise

type Name = string | ((name: string) => string)

/**
 * Describes the function to be executed when an Program shut's down
 */
export type Exit<A, X> = (value: Value<A> | undefined, forced: boolean) => undefined | Value<X>

/**
 * @data
 * @constructor Program
 * @since 1.0.0
 */
// eslint-disable-line @typescript-eslint/no-explicit-any
export class Program<A, X = any> {
    private id: string = _.uniqueId()

    private runCount = 0
    private output: Value<A> | undefined
    private hasOutput = false

    constructor(
        private readonly run: Lazy<Value<A>>,
        private readonly exit?: Exit<A, X>,
        public readonly name = run.name,
        public readonly timeout = 0,
    ) {
        this.timeout = Math.abs(timeout) || 0
    }

    /**
     * They call me map. They call me fmap. Beep beep boop boop I can haz functors.
     * Map over an existing Program to create a program that returns the result of applying the output of `A` to `f`
     *
     * @param f A function from `A` to `B`
     * @param name The name of the program created. Defaults to `f.name`
     */
    public map<B>(f: (a: A) => B, name: Name = f.name): Program<B, X | undefined> {
        if (process.env.NODE_ENV !== 'production') {
            if (!name) {
                console.info(this, f)
                throw new Error('For proper debugging and hot-reloading purposed. Program must have a name.')
            }
        }

        return create(
            () => {
                const result = this.start()
                if (isPromise(result)) {
                    return result.then(f)
                } else {
                    return f(result)
                }
            },
            (_value, forced) => this.stop(forced),
            `${typeof name === 'string' ? name : name(this.name)} ← ${this.name}`,
            this.timeout,
        )
    }

    /**
     * Similar to `map` but does not wait for the ouput of A to resolve if it is a promise.
     * @param f  A function from `A` or a `Promise<A>` to B
     * @param name The name of the program created. Defaults to `f.name`
     */
    public mapValue<B>(f: (a: Value<A>) => B, name = f.name): Program<B, X | undefined> {
        if (process.env.NODE_ENV !== 'production') {
            if (!name) {
                console.info(this, f)
                throw new Error('For proper debugging and hot-reloading purposed. Program must have a name.')
            }
        }

        return create(
            () => f(this.start()),
            (_value, forced) => this.stop(forced),
            `${name || f.name} ↞ ${this.name}`,
            this.timeout,
        )
    }

    /**
     * Boots the executable.
     *
     * This is increases the `runCount` of the program. If the program already
     * has an output and `forceRun` is not `true`, it will not execute the `run` function
     * given to the constructor.
     *
     * @params forceRun Forces the program to execute the "run" function passed to the constructor.
     * @returns         The output of the "run" function.
     */
    public start = (forceRun = false) => {
        // tslint:disable-next-line
        if (process.env.NODE_ENV !== 'production') {
            console.info(`Starting: ${this.name}`)
        }

        this.runCount += 1

        if (forceRun === true || !this.hasOutput) {
            this.hasOutput = true
            stack[this.id] = this
            this.output = this.run()
        }

        return this.output! // eslint-disable-line @typescript-eslint/no-non-null-assertion
    }

    /**
     * Attempts to shut down the program. Decreases the run count by 1.
     *
     * If the program has a shutdown timeout set and `force` is `false`
     * `stop` will return a promise of shutting down the program that resolves
     * after the timeout has expired. The promise may resolve with the output
     * of the "exit" function if the `runCount` of the program is less than or
     * equal to zero.
     *
     * Otherwise, if `force` is not `true` and the `runCount` is less than or equal
     * to zero, `stop` will return the result of `this.exitWith`
     *
     * In all other cases, `stop` will return undefined
     *
     * @params force Forces the program to shut down.
     * @returns `undefined` or a promise of `undefined` if the run count is larger than zero. Otherwise a promise of the ouput of the exit function.
     */
    public stop = (force = false) => {
        if (this.runCount <= 0) {
            if (process.env.NODE_ENV !== 'production') {
                // tslint:disable-next-line
                console.warn(`${this.name} has no runcount.`)
            }

            return
        }

        // Decrease the run count
        this.runCount -= 1

        // Assign the the ouput of the program to a local variable
        // to allow promises and timeouts to still have access to it
        const output = this.output

        // Stop the program if a shutdown timeout was configured and the
        // program is not being forced to shutdown.
        if (this.timeout > 0 && !force) {
            if (this.timeout <= 0) {
                return this.exitWith(output, false)
            }

            // Return a promise of shutting down the program
            return new Promise<X | undefined>(resolve => {
                setTimeout(() => {
                    // Only really shut down the program after the timeout has expired
                    // if the run count hasn't increased in the mean time.
                    if (this.runCount <= 0) {
                        return resolve(this.exitWith(output, force))
                    }

                    resolve()
                }, this.timeout)
            })
        } else if (force || this.runCount <= 0) {
            return this.exitWith(output, force)
        }

        return
    }

    /**
     * Attempts to shut down the program using `requestIdleCallback` unless the program is being forced to shut down.
     *
     * @param output The current output of the program
     * @param force  Flag indicating if the program is being forced to shut down.
     * @param idle   Flag indicating whether to use `requestIdleCallback`. Defaults to `"not force"`
     * @returns The ouput of - or a promise of the output of - the exit function or undefined
     */
    private exitWith<T>(output: Value<A> | undefined, force: boolean, idle = !force) {
        if (idle) {
            return new Promise<X | undefined>(resolve => {
                // @ts-ignore
                const window: Window = global || {}
                window.requestIdleCallback(deadline => {
                    if (this.runCount <= 0) {
                        if (process.env.NODE_ENV !== 'production') {
                            const remainingTime =
                                typeof deadline.timeRemaining === 'function' ? deadline.timeRemaining() : -1
                            console.warn(`Stopping ${this.name}${force ? ' [F]' : ''}[I: ${remainingTime.toFixed(2)}]`) // tslint:disable-line
                        }

                        this.clear()

                        if (this.exit) {
                            return resolve(this.exit(output, force))
                        }
                    }

                    return resolve()
                })
            })
        }

        if (process.env.NODE_ENV !== 'production') {
            console.warn(`Stopping ${this.name}${force ? ' [F]' : ''}`) // tslint:disable-line
        }

        this.clear()

        if (this.exit) {
            return this.exit(output, force)
        }

        return undefined
    }

    /**
     * Resets the program. Forces it to shut down and clears all output.
     */
    public reset() {
        // tslint:disable-next-line
        if (process.env.NODE_ENV !== 'production') {
            console.warn(`Resetting: ${this.name}`)
        }

        this.stop(true)
        this.clear()
    }

    /**
     * Clears the programs output and resets it's run count.
     */
    private clear() {
        this.output = undefined
        this.runCount = 0
        this.hasOutput = false
        delete stack[this.id]
    }

    /**
     * The call me chain. They call me bind. They call me flatMap. Beep beep boop boop I can haz monads.
     * Given a function from A to Program<B> creates an executable that when run, will apply the output
     * of this (A) to `f` and run the executable returned by `f`
     * @param f A function taking in the ouput of `A` and returning an `Program<B>`
     * @param name The name of the executable that will be created. Defaults to the name of `f`
     * @returns An executable of `B`
     */
    public chain<B, Y>(f: (a: A) => Program<B, Y>, name: Name = f.name): Program<B, X | undefined> {
        // Keep a mutuable variable around with the result of `f`
        // So that the executable that is "created on the fly"
        // Can be properly shut down
        let execB: Program<B, Y> | undefined

        if (process.env.NODE_ENV !== 'production') {
            if (!name) {
                console.info(this, f)
                throw new Error('For proper debugging and hot-reloading purposed. Program must have a name.')
            }
        }

        return create(
            () => {
                // Start A
                const result = this.start()

                // If A returns a promise, then await it's result before running `f`
                if (isPromise(result)) {
                    return new Promise<B>(async (resolve, reject) => {
                        const resultA = await result

                        // Only run `f` if A has not been shut down
                        if (this.runCount >= 0) {
                            // Create Program<B> by passing the output of A to `f`
                            execB = f(resultA)
                            resolve(execB.start())
                        } else {
                            reject()
                        }
                    })
                    // Otherwise, keep going
                } else {
                    // Create Program<B> by passing the output of A to `f`
                    execB = f(result)
                    return execB.start()
                }
            },
            (_value, forced) => {
                // Shut down B if it has been created
                if (execB) {
                    // Stop B first before A
                    const exitBResult = execB.stop(forced)

                    // If the program is not being forced to shut down
                    // and the stopping B results in a promise
                    // then wait until the promise of shutting down B
                    if (!forced && exitBResult != null) {
                        if (isPromise(exitBResult)) {
                            return exitBResult.then(async () => {
                                return await this.stop()
                            })
                        }
                    }
                }

                // Otherwise, just stop A
                return this.stop(forced)
            },
            `${typeof name === 'string' ? name : name(this.name)} 🡸 ${this.name}`,
            this.timeout,
        )
    }

    /**
     * Creates a program that runs A and then B. A will also be shut down after B
     * @param exec
     */
    public andThen<B>(exec: Program<B>): Program<B, X | undefined> {
        return andThen(this, exec)
    }

    public inspect(): string {
        return this.toString()
    }

    public toString(): string {
        return `new Program(${this.name || this.run})`
    }
}

/**
 * Lifts an IO action into a Program
 * @function
 * @since 1.0.0
 */
export const fromIO = <A>(io: IO<Value<A>>, exit?: () => void, name = ''): Program<A> => {
    if (process.env.NODE_ENV !== 'production') {
        if (!name) {
            console.info(io)
            throw new Error('For proper debugging and hot-reloading purposed. Program must have a name.')
        }
    }

    return create(io, exit, name)
}

/**
 * @function
 * @since 1.7.0
 */
export const delay = <A>(millis: number, a: A, name = `${Math.random()}`): Program<A> => {
    return create(
        () =>
            new Promise(resolve => {
                setTimeout(() => {
                    resolve(a)
                }, millis)
            }),
        undefined,
        `delay(${millis}:${name})`,
    )
}

//

export const create = <T, Y>(run: Lazy<Value<T>>, exit?: Exit<T, Y>, name = run.name, timeout?: number) => {
    if (process.env.NODE_ENV !== 'production') {
        if (!name) {
            console.info(run, exit)
            throw new Error('For proper debugging and hot-reloading purposed. Program must have a name.')
        }

        if (executablesByName[name]) {
            return executablesByName[name] as Program<T, Y>
        }
    }

    const exec = new Program(run, exit, name, timeout)
    executablesByName[name] = exec

    return exec
}

export const once = <T>(run: Lazy<Value<T>>, name = run.name) => {
    if (process.env.NODE_ENV !== 'production') {
        if (!name) {
            console.info(run)
            throw new Error('For proper debugging and hot-reloading purposed. Program must have a name.')
        }
    }

    return create(_.once(run), undefined, `once(${name})`)
}

export const mapOnce = <T, X>(exec: Program<T, X>) =>
    create(_.once(() => exec.start()), (value, forced) => exec.stop(forced), `once(${exec.name})`, exec.timeout)

// prettier-ignore
export function combine<T1, T2>(t1: Program<T1>, t2: Program<T2>): Program<[T1, T2]>
// prettier-ignore
export function combine<T1, T2, T3>(t1: Program<T1>, t2: Program<T2>, t3: Program<T3>): Program<[T1, T2, T3]>
// prettier-ignore
export function combine<T1, T2, T3, T4>(t1: Program<T1>, t2: Program<T2>, t3: Program<T3>, t4: Program<T4>): Program<[T1, T2, T3, T4]>
// prettier-ignore
export function combine<T1, T2, T3, T4, T5>(t1: Program<T1>, t2: Program<T2>, t3: Program<T3>, t4: Program<T4>, t5: Program<T5>): Program<[T1, T2, T3, T4, T5]>
// prettier-ignore
export function combine<T1, T2, T3, T4, T5, T6>(t1: Program<T1>, t2: Program<T2>, t3: Program<T3>, t4: Program<T4>, t5: Program<T5>, t6: Program<T6>): Program<[T1, T2, T3, T4, T5, T6]>
// prettier-ignore
export function combine<T1, T2, T3, T4, T5, T6, T7>(t1: Program<T1>, t2: Program<T2>, t3: Program<T3>, t4: Program<T4>, t5: Program<T5>, t6: Program<T6>, t7: Program<T7>): Program<[T1, T2, T3, T4, T5, T6, T7]>
// prettier-ignore
export function combine<T1, T2, T3, T4, T5, T6, T7, T8>(t1: Program<T1>, t2: Program<T2>, t3: Program<T3>, t4: Program<T4>, t5: Program<T5>, t6: Program<T6>, t7: Program<T7>, t8: Program<T8>): Program<[T1, T2, T3, T4, T5, T6, T7, T8]>
// prettier-ignore
export function combine<T1, T2, T3, T4, T5, T6, T7, T8, T9>(t1: Program<T1>, t2: Program<T2>, t3: Program<T3>, t4: Program<T4>, t5: Program<T5>, t6: Program<T6>, t7: Program<T7>, t8: Program<T8>, t9: Program<T9>): Program<[T1, T2, T3, T4, T5, T6, T7, T8, T9]>
// prettier-ignore
export function combine<T1, T2, T3, T4, T5, T6, T7, T8, T9, T10>(t1: Program<T1>, t2: Program<T2>, t3: Program<T3>, t4: Program<T4>, t5: Program<T5>, t6: Program<T6>, t7: Program<T7>, t8: Program<T8>, t9: Program<T9>, t10: Program<T10>): Program<[T1, T2, T3, T4, T5, T6, T7, T8, T9, T10]>
// prettier-ignore
export function combine<T1, T2, T3, T4, T5, T6, T7, T8, T9, T10, T11>(t1: Program<T1>, t2: Program<T2>, t3: Program<T3>, t4: Program<T4>, t5: Program<T5>, t6: Program<T6>, t7: Program<T7>, t8: Program<T8>, t9: Program<T9>, t10: Program<T10>, t11: Program<T11>): Program<[T1, T2, T3, T4, T5, T6, T7, T8, T9, T10, T11]>
// prettier-ignore
export function combine<T1, T2, T3, T4, T5, T6, T7, T8, T9, T10, T11, T12>(t1: Program<T1>, t2: Program<T2>, t3: Program<T3>, t4: Program<T4>, t5: Program<T5>, t6: Program<T6>, t7: Program<T7>, t8: Program<T8>, t9: Program<T9>, t10: Program<T10>, t11: Program<T11>, t12: Program<T12>): Program<[T1, T2, T3, T4, T5, T6, T7, T8, T9, T10, T11, T12]>
// prettier-ignore
export function combine<T1, T2, T3, T4, T5, T6, T7, T8, T9, T10, T11, T12, T13>(t1: Program<T1>, t2: Program<T2>, t3: Program<T3>, t4: Program<T4>, t5: Program<T5>, t6: Program<T6>, t7: Program<T7>, t8: Program<T8>, t9: Program<T9>, t10: Program<T10>, t11: Program<T11>, t12: Program<T12>, t13: Program<T13>): Program<[T1, T2, T3, T4, T5, T6, T7, T8, T9, T10, T11, T12, T13]>
// prettier-ignore
export function combine<T1, T2, T3, T4, T5, T6, T7, T8, T9, T10, T11, T12, T13, T14>(t1: Program<T1>, t2: Program<T2>, t3: Program<T3>, t4: Program<T4>, t5: Program<T5>, t6: Program<T6>, t7: Program<T7>, t8: Program<T8>, t9: Program<T9>, t10: Program<T10>, t11: Program<T11>, t12: Program<T12>, t13: Program<T13>, t14: Program<T14>): Program<[T1, T2, T3, T4, T5, T6, T7, T8, T9, T10, T11, T12, T13, T14]>
// prettier-ignore
export function combine<T1, T2, T3, T4, T5, T6, T7, T8, T9, T10, T11, T12, T13, T14, T15>(t1: Program<T1>, t2: Program<T2>, t3: Program<T3>, t4: Program<T4>, t5: Program<T5>, t6: Program<T6>, t7: Program<T7>, t8: Program<T8>, t9: Program<T9>, t10: Program<T10>, t11: Program<T11>, t12: Program<T12>, t13: Program<T13>, t14: Program<T14>, t15: Program<T15>): Program<[T1, T2, T3, T4, T5, T6, T7, T8, T9, T10, T11, T12, T13, T14, T15]>
// prettier-ignore
export function combine(...execas: Program<any>[]): Program<any> {
  const exes = execas
  return create(
    () => exes.map(exec => exec.start()),
    (value, forced) => exes.map(exec => exec.stop(forced)),
    `[${exes.map(exe => exe.name).join(', ')}]`
  )
}

// prettier-ignore
export function andThen<X1, T1, T2>(t1: Program<T1, X1>, t2: Program<T2>): Program<T2, X1 | undefined>
// prettier-ignore
export function andThen<X1, T1, T2, T3>(t1: Program<T1, X1>, t2: Program<T2>, t3: Program<T3>): Program<T3, X1 | undefined>
// prettier-ignore
export function andThen<X1, T1, T2, T3, T4>(t1: Program<T1, X1>, t2: Program<T2>, t3: Program<T3>, t4: Program<T4>): Program<T4, X1 | undefined>
// prettier-ignore
export function andThen<X1, T1, T2, T3, T4, T5>(t1: Program<T1, X1>, t2: Program<T2>, t3: Program<T3>, t4: Program<T4>, t5: Program<T5>): Program<T5, X1 | undefined>
// prettier-ignore
export function andThen<X1, T1, T2, T3, T4, T5, T6>(t1: Program<T1, X1>, t2: Program<T2>, t3: Program<T3>, t4: Program<T4>, t5: Program<T5>, t6: Program<T6>): Program<T6, X1 | undefined>
// prettier-ignore
export function andThen<X1, T1, T2, T3, T4, T5, T6, T7>(t1: Program<T1, X1>, t2: Program<T2>, t3: Program<T3>, t4: Program<T4>, t5: Program<T5>, t6: Program<T6>, t7: Program<T7>): Program<T7, X1 | undefined>
// prettier-ignore
export function andThen<X1, T1, T2, T3, T4, T5, T6, T7, T8>(t1: Program<T1, X1>, t2: Program<T2>, t3: Program<T3>, t4: Program<T4>, t5: Program<T5>, t6: Program<T6>, t7: Program<T7>, t8: Program<T8>): Program<T8, X1 | undefined>
// prettier-ignore
export function andThen<X1, T1, T2, T3, T4, T5, T6, T7, T8, T9>(t1: Program<T1, X1>, t2: Program<T2>, t3: Program<T3>, t4: Program<T4>, t5: Program<T5>, t6: Program<T6>, t7: Program<T7>, t8: Program<T8>, t9: Program<T9>): Program<T9, X1 | undefined>
// prettier-ignore
export function andThen<X1, T1, T2, T3, T4, T5, T6, T7, T8, T9, T10>(t1: Program<T1, X1>, t2: Program<T2>, t3: Program<T3>, t4: Program<T4>, t5: Program<T5>, t6: Program<T6>, t7: Program<T7>, t8: Program<T8>, t9: Program<T9>, t10: Program<T10>): Program<T10, X1 | undefined>
// prettier-ignore
export function andThen<X1, T1, T2, T3, T4, T5, T6, T7, T8, T9, T10, T11>(t1: Program<T1, X1>, t2: Program<T2>, t3: Program<T3>, t4: Program<T4>, t5: Program<T5>, t6: Program<T6>, t7: Program<T7>, t8: Program<T8>, t9: Program<T9>, t10: Program<T10>, t11: Program<T11>): Program<T11, X1 | undefined>
// prettier-ignore
export function andThen<X1, T1, T2, T3, T4, T5, T6, T7, T8, T9, T10, T11, T12>(t1: Program<T1, X1>, t2: Program<T2>, t3: Program<T3>, t4: Program<T4>, t5: Program<T5>, t6: Program<T6>, t7: Program<T7>, t8: Program<T8>, t9: Program<T9>, t10: Program<T10>, t11: Program<T11>, t12: Program<T12>): Program<T12, X1 | undefined>
// prettier-ignore
export function andThen<X1, T1, T2, T3, T4, T5, T6, T7, T8, T9, T10, T11, T12, T13>(t1: Program<T1, X1>, t2: Program<T2>, t3: Program<T3>, t4: Program<T4>, t5: Program<T5>, t6: Program<T6>, t7: Program<T7>, t8: Program<T8>, t9: Program<T9>, t10: Program<T10>, t11: Program<T11>, t12: Program<T12>, t13: Program<T13>): Program<T13, X1 | undefined>
// prettier-ignore
export function andThen<X1, T1, T2, T3, T4, T5, T6, T7, T8, T9, T10, T11, T12, T13, T14>(t1: Program<T1, X1>, t2: Program<T2>, t3: Program<T3>, t4: Program<T4>, t5: Program<T5>, t6: Program<T6>, t7: Program<T7>, t8: Program<T8>, t9: Program<T9>, t10: Program<T10>, t11: Program<T11>, t12: Program<T12>, t13: Program<T13>, t14: Program<T14>): Program<T14, X1 | undefined>
// prettier-ignore
export function andThen<X1, T1, T2, T3, T4, T5, T6, T7, T8, T9, T10, T11, T12, T13, T14, T15>(t1: Program<T1, X1>, t2: Program<T2>, t3: Program<T3>, t4: Program<T4>, t5: Program<T5>, t6: Program<T6>, t7: Program<T7>, t8: Program<T8>, t9: Program<T9>, t10: Program<T10>, t11: Program<T11>, t12: Program<T12>, t13: Program<T13>, t14: Program<T14>, t15: Program<T15>): Program<T15, X1 | undefined>
// prettier-ignore
export function andThen(execa: Program<any>, ...execas: Program<any>[]) {
    return [execa, ...execas].reduce((execx, execy) => execx.chain(() => execy, execy.name))
}

const stack: { [id: string]: Program<any, any> } = {}
const executablesByName: { [name: string]: Program<any, any> } = {}

export const getStack = () => stack
export const getProgramsByName = () => executablesByName

if (typeof window !== 'undefined') {
    // @ts-ignore
    window._Program = {
        get byName() {
            return getProgramsByName()
        },

        get stack() {
            return getStack()
        },
    }
}
