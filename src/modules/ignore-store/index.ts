import { Action, Dispatch, MiddlewareAPI } from 'redux'

export interface IgnoreStoreAction extends Action {
    meta?: {
        ignoreStore?: boolean
    }
}

export interface IgnoreStoreOptions {
    log?: boolean
}

const createIgnoreStoreMiddleware = (maybeOptions?: IgnoreStoreOptions) => (store: MiddlewareAPI) => (
    dispatch: Dispatch,
) => <A extends IgnoreStoreAction>(action: A) => {
    const options: IgnoreStoreOptions = maybeOptions || {}

    if (action.meta && action.meta.ignoreStore) {
        return null
    }

    const state = store.getState()
    const result = dispatch(action)
    const nextState = store.getState()

    if (options.log && process.env.NODE_ENV !== 'production' && state === nextState) {
        const { type } = action
        console.warn(
            `${type} does not mutate state.\n` +
                'If this action does not have any reducers\n' +
                'and is targetting only middleware then you might want to use\n' +
                'action.meta.ignoreStore = true\n' +
                'to avoid re-rendering of the application and improve performance.',
        )
    }

    return result
}

export default createIgnoreStoreMiddleware
