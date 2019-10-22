export const appPrefix = `@todos/`

const prefixActionType = <T extends string>(actionType: T) => `${appPrefix}${actionType}` as T

export const LOAD = prefixActionType('LOAD')
export const ADD = prefixActionType('ADD')
export const REMOVE = prefixActionType('REMOVE')
export const RENAME = prefixActionType('RENAME')
export const TOGGLE_COMPLETE = prefixActionType('TOGGLE_COMPLETE')
