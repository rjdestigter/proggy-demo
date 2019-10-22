import * as _ from 'lodash'
import { TodosById } from './types'

export const todo1 = {
    id: _.uniqueId(),
    name: 'Wake up',
    completed: true,
}

export const todo2 = {
    id: _.uniqueId(),
    name: 'Run 5k',
    completed: false,
}

export const todo3 = {
    id: _.uniqueId(),
    name: 'Eat breakfast',
    completed: true,
}

export const todos = [todo1, todo2, todo3]

export const todosById: TodosById = _.keyBy(todos, 'id')
