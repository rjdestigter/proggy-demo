import { ActionAdd, ActionRemove, ActionRename, ActionToggleComplete, TodoAction, ActionLoad } from './actions'

import { Todo, TodosById } from './types'
import { ADD, RENAME, REMOVE, TOGGLE_COMPLETE, LOAD } from './constants'

import * as _ from 'lodash'
import { Reducer } from 'redux'

export const load = (state: TodosById, action: ActionLoad): TodosById => {
    return {
        ...state,
        ...action.payload,
    }
}

export const add = (state: TodosById, action: ActionAdd): TodosById => {
    const todo: Todo = {
        name: action.payload.name,
        completed: !!action.payload.completed,
        id: _.uniqueId(),
    }

    return {
        ...state,
        [todo.id]: todo,
    }
}

export const rename = (state: TodosById, action: ActionRename): TodosById => {
    const todo = state[action.payload.id]

    if (todo) {
        return {
            ...state,
            [todo.id]: { ...todo, name: action.payload.name },
        }
    }

    return state
}

export const remove = (state: TodosById, action: ActionRemove): TodosById => {
    const todo = state[action.payload]

    if (todo) {
        const clonedState = {
            ...state,
        }

        delete clonedState[action.payload]

        return clonedState
    }

    return state
}

export const toggleComplete = (state: TodosById, action: ActionToggleComplete): TodosById => {
    const todo = state[action.payload]

    if (todo) {
        return {
            ...state,
            [todo.id]: { ...todo, completed: !todo.completed },
        }
    }

    return state
}

export const todos: Reducer<TodosById, TodoAction> = (state: TodosById = {}, action: TodoAction) => {
    switch (action.type) {
        case LOAD:
            return load(state, action)
        case ADD:
            return add(state, action)
        case RENAME:
            return rename(state, action)
        case REMOVE:
            return remove(state, action)
        case TOGGLE_COMPLETE:
            return toggleComplete(state, action)
    }

    return state
}

export default todos
