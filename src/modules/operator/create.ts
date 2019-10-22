import * as _ from 'lodash'
import { AnyAction, Reducer } from 'redux'

export const prefix = '@asurionwms/operator/'

export interface Operation<T> {
    id: string
    state: T
    submitting: boolean
    success: boolean
    errors: string[]
}

export type OperatorState<T, M extends MultiOrSingle> = M extends Multi
    ? {
          [id: string]: Operation<T>
      }
    : Operation<T>

export type OperatorReducer<T, M extends MultiOrSingle> = (
    state: OperatorState<T, M> | undefined,
    action: AnyAction,
) => OperatorState<T, M>

type Single = 'SINGLE'
type Multi = 'MULTI'
type MultiOrSingle = Single | Multi

const multi: Multi = 'MULTI'

export type MultiActionCreator<T> = (...payload: Operation<T>[]) => { type: string; payload: Operation<T>[] }
export type SingleActionCreator<T> = (payload: Operation<T>) => { type: string; payload: Operation<T> }

export interface MultiActionCreators<T> {
    create: MultiActionCreator<T>
    update: MultiActionCreator<T>
    submit: MultiActionCreator<T>
    succeed: MultiActionCreator<T>
    fail: MultiActionCreator<T>
}

export interface SingleActionCreators<T> {
    create: SingleActionCreator<T>
    update: SingleActionCreator<T>
    submit: SingleActionCreator<T>
    succeed: SingleActionCreator<T>
    fail: SingleActionCreator<T>
}

export type ActionCreators<T, X extends MultiOrSingle = Multi> = X extends Multi
    ? MultiActionCreators<T>
    : SingleActionCreators<T>

export type CreateActionCreator<T, M extends MultiOrSingle> = M extends Multi
    ? (type: string) => MultiActionCreator<T>
    : (type: string) => SingleActionCreator<T>

export function composeCreateActionCreator<T>(mode: MultiOrSingle): CreateActionCreator<T, typeof mode> {
    if (mode === multi) {
        return (type: string) => (...payload: Array<Operation<T>>) => ({ type, payload })
    }

    return (type: string) => (payload: Operation<T>) => ({ type, payload })
}

export interface Operator<T, X extends MultiOrSingle = Multi> {
    prefix: string
    actionTypes: {
        CREATE: string
        UPDATE: string
        SUBMIT: string
        SUCCEED: string
        FAIL: string
        CANCEL: string
    }
    actionCreators: X extends Multi ? MultiActionCreators<T> : SingleActionCreators<T>
    create: (state: T) => Operation<T>
    submit: (operation: Operation<T>) => Operation<T>
    succeed: (operation: Operation<T>) => Operation<T>
    fail: (operation: Operation<T>) => (errors: Array<[string, string, string]>) => Operation<T>
    singleReducer: (initialState: T) => (state: Operation<T> | undefined, action: AnyAction) => Operation<T>
    reducer: (initialState: OperatorState<T, X>) => Reducer<OperatorState<T, X>>
}

export const CREATE = `${prefix}CREATE/`
export const UPDATE = `${prefix}UPDATE/`
export const SUBMIT = `${prefix}SUBMIT/`
export const SUCCEED = `${prefix}SUCCEED/`
export const FAIL = `${prefix}FAIL/`
export const CANCEL = `${prefix}CANCEL/`

// Utils
export default function createOperator<T>(name: string, mode: Single): Operator<T, Single>
export default function createOperator<T>(name: string, mode: Multi): Operator<T, Multi>
export default function createOperator<T>(name: string, mode: any): any {
    // Action Types
    const actionTypes = {
        CREATE: `${CREATE}${name}`,
        UPDATE: `${UPDATE}${name}`,
        SUBMIT: `${SUBMIT}${name}`,
        SUCCEED: `${SUCCEED}${name}`,
        FAIL: `${FAIL}${name}`,
        CANCEL: `${CANCEL}${name}`,
    }

    // Action Creators
    const createActionCreator: any = composeCreateActionCreator<T>(mode)

    const actionCreators: ActionCreators<T, typeof mode> = {
        create: createActionCreator(actionTypes.CREATE),
        update: createActionCreator(actionTypes.UPDATE),
        submit: createActionCreator(actionTypes.SUBMIT),
        succeed: createActionCreator(actionTypes.SUCCEED),
        fail: createActionCreator(actionTypes.FAIL),
    }

    // Transformations
    const create = (state: T): Operation<T> => {
        return {
            id: _.uniqueId(),
            state,
            submitting: false,
            success: false,
            errors: [],
        }
    }

    const submit = (operation: Operation<T>): Operation<T> => {
        return {
            ...operation,
            submitting: true,
            success: false,
            errors: [],
        }
    }

    const succeed = (operation: Operation<T>): Operation<T> => {
        return {
            ...operation,
            submitting: false,
            success: true,
            errors: [],
        }
    }

    const fail = (operation: Operation<T>) => (errors: string[]): Operation<T> => {
        return {
            ...operation,
            submitting: false,
            success: false,
            errors,
        }
    }

    const reducer: any = (initialState: OperatorState<T, typeof mode>) => (
        state: OperatorState<T, typeof mode> | undefined = initialState,
        action: AnyAction,
    ) => {
        switch (action.type) {
            case actionTypes.CREATE:
            case actionTypes.UPDATE:
            case actionTypes.SUBMIT:
            case actionTypes.SUCCEED:
            case actionTypes.FAIL:
                return mode === 'MULTI'
                    ? {
                          ...state,
                          ..._.keyBy(action.payload, 'id'),
                      }
                    : action.payload
            default:
                return state
        }
    }

    return {
        prefix: `${prefix}${name}`,
        actionTypes,
        actionCreators,
        create,
        submit,
        succeed,
        fail,
        reducer,
    }
}
