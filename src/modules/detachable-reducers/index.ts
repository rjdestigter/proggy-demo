import { Store, Reducer, ReducersMapObject, Action, AnyAction, combineReducers } from 'redux'

/**
 * Type describing whether a reducer has been mutated to be detachable
 */
export type DetachableReducer<S = any, A extends Action = AnyAction> = Reducer<S, A> & { _DETACHABLE: Reducer<S, A> }

/**
 * A Redux store enhanced with the detachable reducers APIs
 */
export type StoreWithDetachableReducers<S = {}, A extends Action<any> = AnyAction> = Store<S, A> & {
    attachReducer: <K extends string>(
        name: K,
    ) => <S2 = {}, A2 extends Action<any> = AnyAction>(
        reducerToInject: Reducer<S2, A2>,
    ) => StoreWithDetachableReducers<S & { [P in K]: S2 }, A | A2>
    detachReducer: <K extends keyof S>(name: K) => StoreWithDetachableReducers<Omit<S, K>, A>
    refreshReducer: () => void
}

/**
 * isDetachableReducer - Type guard checking if a reducer has been mutated to be detachable
 *
 * @param reducer - The reducer
 * @returns Returns `true` if the given reducer is detachable.
 */
const isDetachableReducer = <S, A extends Action<any> = AnyAction>(
    reducer: Reducer<S, A>,
): reducer is DetachableReducer<S, A> => Object.prototype.hasOwnProperty.call(reducer, _DETACHABLE)

/**
 * makeReducerDetachable - Mutates a reducer function into it's detachable type.
 *
 * @param reducer The reducer to be made detachable
 * @returns The reducer as a detachable reducer.
 */
export const makeReducerDetachable = <S, A extends Action<any> = AnyAction>(
    reducer: Reducer<S, A>,
    initialState: S,
) => {
    if (!isDetachableReducer<S, A>(reducer)) {
        // Caching reducer state here so that when a reducer is re-attached it's previous state is memoized.
        let previousState = initialState

        const detachableReducer: Reducer<S, A> = (state: S | undefined = previousState, action: A) => {
            previousState = reducer(state, action)
            return previousState
        }

        Object.defineProperty(reducer, _DETACHABLE, { value: detachableReducer })
    }

    return reducer as DetachableReducer<S, A>
}

/**
 *
 */
const _DETACHABLE = '_DETACHABLE'

/**
 * Replaces the store's reducer
 */
export const refreshReducer = <S, A extends Action<any> = AnyAction>(store: Store<S, A>) => (
    reducerMap: ReducersMapObject<S, A>,
): void => {
    const nextReducer = combineReducers(reducerMap)
    store.replaceReducer(nextReducer)
}

/**
 * Attaches a reducer to the store
 * @param name Name of the reducer. Usually a module's name or prefix.
 * @param reducerToInject The reducer
 */
const makeAttachReducer = <S1, A1 extends Action<any> = AnyAction>(
    store: Store<S1, A1>,
    mutuableReducerMap: ReducersMapObject<any, any>,
) => <K extends string>(name: K) => <S2, A2 extends Action<any> = AnyAction>(reducerToInject: Reducer<S2, A2>) => {
    const nextStore: StoreWithDetachableReducers<S1 & { [P in typeof name]: S2 }, A1 | A2> = store as any

    if (mutuableReducerMap[name]) {
        return nextStore
    }

    let detachableReducer: Reducer<S2, A2>

    if (isDetachableReducer<S2, A2>(reducerToInject)) {
        detachableReducer = reducerToInject._DETACHABLE
    } else {
        // Keep track of the the reducer's state. This is necessary
        // to not loose information after this reducer is detached.
        const initialState: S2 = reducerToInject(undefined, {
            type: `@rewired/detachable-reducers/attach/${Math.random()}`,
        } as any)

        detachableReducer = makeReducerDetachable(reducerToInject, initialState)._DETACHABLE
    }

    // Mutate mutuableReducerMap by adding the reducer to be attached
    mutuableReducerMap[name] = detachableReducer

    refreshReducer(store)(mutuableReducerMap)

    return nextStore
}

/**
 * Attaches a reducer to the store
 * @param name Name of the reducer. Usually a module's name or prefix.
 * @param reducerToInject The reducer
 */
const makeDetachReducer = <S, A extends Action<any> = AnyAction>(
    store: Store<S, A>,
    mutuableReducerMap: ReducersMapObject<any, any>,
) => <K extends keyof S>(name: K) => {
    const nextStore: StoreWithDetachableReducers<Omit<S, K>, A> = store as any

    // Remove the reducer from the map of detached reducers
    delete mutuableReducerMap[name]

    // Delete the part of store state belonging to this reducer
    // @ts-ignore
    delete store.getState()[name]

    return nextStore
}

/**
 *
 * @param api
 * @param initialReducerMap
 */
const enhanceStoreWithDetachableReducers = <
    // Initial type of state
    S = {},
    A extends Action<any> = AnyAction
>(
    // Extends the store type providing a `getState` and `replaceReducer` API
    store: Store<S, A>,
    // Initial reducer map providing state `S`
    initialReducerMap?: ReducersMapObject<S, A>,
) => {
    /**
     * Map of attached reducers. This map is mutated when reducers are attached or detached from the store.
     * @private
     */
    const mutuableReducerMap: ReducersMapObject<any, any> = initialReducerMap || {
        _initialized: () => true,
    }

    const attachReducer = makeAttachReducer(store, mutuableReducerMap)
    const detachReducer = makeDetachReducer(store, mutuableReducerMap)

    const nextStore: StoreWithDetachableReducers<S, A> = Object.assign(store, {
        attachReducer,
        detachReducer,
        refreshReducer: () => refreshReducer(store)(mutuableReducerMap),
    })

    return nextStore
}

export default enhanceStoreWithDetachableReducers
