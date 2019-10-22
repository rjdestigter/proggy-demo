// Store
import store from './store'

// Utils
import {
    makeStoreProgramCreator,
    makeReducerProgramCreator,
    makeSagaProgramCreator,
    makeEpicProgramCreator,
} from '../modules/redux-program'

// Types
import { /* AnyAction, Reducer,  */ Store } from 'redux'
import { Selector } from 'reselect'
// import { Saga, Task } from 'redux-saga'
// import { ThunkAction } from 'redux-thunk'
// import { create } from '../modules/program'
// import { Option } from 'fp-ts/lib/Option'
// import { Either } from 'fp-ts/lib/Either'
// import { connect } from 'react-redux'
// import withProgram from '../modules/react-program/withProgram'

// Exports

/**
 * Utility function for creating programs that need access to the redux store.
 */
export const createStoreProgram = makeStoreProgramCreator(store)

/**
 * Utility function for creating programs that will attach or detach reducers.
 */
export const createReducerProgram = makeReducerProgramCreator(store)

/**
 * Utility function for creating programs will dispatch an action.
 */
export const createDispatchProgram = <T>(actionCreator: () => T) => {
    const fn = <StoreType extends Store>(store: StoreType) => {
        const action = actionCreator()

        // @ts-ignore
        store.dispatch(action)

        return action
    }

    Object.defineProperty(fn, 'name', {
        value: `dispatch(${actionCreator.name})`,
    })

    return createStoreProgram(fn)
}

/**
 * Utility function for creating programs will select data from store state
 */
export const createSelectorProgram = <T>(selector: Selector<any, T>) => {
    const fn = <StoreType extends Store>(store: StoreType) => selector(store.getState())
    Object.defineProperty(fn, 'name', { value: `select(${selector.name})` })

    return createStoreProgram(fn)
}

export const createSagaProgram = makeSagaProgramCreator(store)

export const createEpicProgram = makeEpicProgramCreator(store)

export const select = createSelectorProgram
export const dispatch = createDispatchProgram
export const reduce = createReducerProgram
export const withStore = createStoreProgram
export const runSaga = createSagaProgram
export const runEpic = createEpicProgram

/*
export const fromPromise = <T, K extends string>(name: K, getPromise: () => Promise<T>) => {
    type S = { [P in K]?: T }

    const uniqueName = `fromPromise(${name})`
    const actionType = `${uniqueName}/RESOLVED`

    const reducer: Reducer<T> = (state: T | undefined = undefined, action: AnyAction) => {
        if ((action.type = actionType)) {
            return action.payload as T
        }

        return state
    }

    const reducerProgram = createReducerProgram(uniqueName, reducer)

    const program = create(getPromise, undefined, uniqueName).chain(data =>
        createStoreProgram(store => store.dispatch({ type: actionType, payload: data })),
    )

    const data$ = (storeState: any): undefined | T => storeState[uniqueName]

    return {
        selector: data$,
        program: reducerProgram.andThen(program),
    }
}
*/
