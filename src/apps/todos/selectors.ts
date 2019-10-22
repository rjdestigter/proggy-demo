import { TodosById } from './types'
import { appPrefix } from './constants'

export const todosById = (state: any): TodosById => state[appPrefix]

export const todos = (state: any) => Object.values(todosById(state))
