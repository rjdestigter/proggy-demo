import { ADD, REMOVE, RENAME, TOGGLE_COMPLETE, LOAD } from './constants'
import { TodoId, TodosById } from './types'

export const load = (payload: TodosById) => ({ type: LOAD, payload })
export const add = (payload: { name: string; completed?: boolean }) => ({ type: ADD, payload })
export const remove = (payload: TodoId) => ({ type: REMOVE, payload })
export const rename = (payload: { id: TodoId; name: string }) => ({ type: RENAME, payload })
export const toggleComplete = (payload: TodoId) => ({ type: TOGGLE_COMPLETE, payload })

export type ActionLoad = ReturnType<typeof load>
export type ActionAdd = ReturnType<typeof add>
export type ActionRemove = ReturnType<typeof remove>
export type ActionRename = ReturnType<typeof rename>
export type ActionToggleComplete = ReturnType<typeof toggleComplete>

export type TodoAction = ActionLoad | ActionAdd | ActionRemove | ActionRename | ActionToggleComplete
