/**
 * Usages of Program for redux
 */

// The store, and the function updating it's reducers
import { StoreWithDetachableReducers } from '../detachable-reducers'

// Program
import { /* andThen, */ create as createProgram, Program, Exit } from '../program/Program'

// Some Redux related types
import { Reducer, Store, Action, AnyAction } from 'redux'
import { Task as SagaTask } from 'redux-saga'
import { Epic } from 'redux-observable'

/** A function, taking the store and returning T */
export type LazyWithStore<T> = <S extends Store>(store: S) => T

/**
 * Create an [[Program]] that when started will run the given function and pass it the
 * store.
 * @param run Function to be run when the Programutable starts.
 */
export const makeStoreProgramCreator = <StoreType extends Store>(store: StoreType) => <T, X = any>(
    run: (store: StoreType) => T,
    exit?: Exit<T, X>,
) => createProgram(() => run(store), exit, `store(${run.name})`)

/**
 * Create an [[Program]] that when started will attach a reducer to the store
 * and when stopped will detach it.
 *
 * @param name The name of the reducer
 * @param reducer The reducer to be attached/detached
 */
export const makeReducerProgramCreator = <S1, A1 extends Action<any> = AnyAction>(
    store: StoreWithDetachableReducers<S1, A1>,
) => <S2, K extends string, A2 extends Action<any> = AnyAction>(name: K, reducer: Reducer<S2, A2>) => {
    return createProgram(
        // Start
        () => store.attachReducer(name)(reducer),
        // Stop
        async maybeNextStore => {
            if (maybeNextStore != null) {
                const nextStore = await maybeNextStore
                nextStore.detachReducer(name)
            }
        },
        `reducer(${name})`,
    )
}

/**
 * Create an IO that will Programute a saga. Only use this if you don't care if a saga
 * is run multiple times. Use [[sagaProgram]] if you need sagas to only run once.
 *
 * @param saga The saga to be run when the IO runs
 */
type WithRunSaga = (saga: () => IterableIterator<any>) => SagaTask

/**
 * Create an [[Program]]
 * @param saga
 * @param timeout
 * @param runOncePerSession
 */
export const makeSagaProgramCreator = <R extends WithRunSaga, T extends { runSaga: R }>(withRunSaga: T) => (
    saga: () => IterableIterator<any>,
    timeout?: number,
) =>
    createProgram(
        () => withRunSaga.runSaga(saga),
        maybeEpic => {
            if (maybeEpic != null) {
                return Promise.resolve(maybeEpic).then(task => task.cancel())
            }
        },
        `saga(${saga.name})`,
        timeout,
    )

export const fromTask = (program: Program<SagaTask>) =>
    program.map(sagaTask => sagaTask.toPromise(), `sagaTask(${program.name})`)

// Redux obs

/**
 * Create an IO that will Programute a saga. Only use this if you don't care if a saga
 * is run multiple times. Use [[sagaProgram]] if you need sagas to only run once.
 *
 * @param saga The saga to be run when the IO runs
 */

export interface WithRunEpic<T extends Action, O extends T = T, S = void, D = any> {
    runEpic: (rootEpic: Epic<T, O, S, D>) => void
}

/**
 * Create an [[Program]]
 * @param saga
 * @param timeout
 * @param runOncePerSession
 */
export const makeEpicProgramCreator = <T extends Action, O extends T = T, S = void, D = any>(
    withRunEpic: WithRunEpic<T, O, S, D>,
) => (epic: Epic<T, O, S, D>, name: string) =>
    createProgram(
        () => withRunEpic.runEpic(epic),
        () => void 0,
        // maybeSagaTask => {
        //     if (maybeSagaTask != null) {
        //         return Promise.resolve(maybeSagaTask).then(task => task.cancel())
        //     }
        // },
        `epic(${name})`,
    )
