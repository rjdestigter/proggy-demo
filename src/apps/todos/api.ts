import { TodosById } from './types'
// import { todosById } from './mocks'
import * as _ from 'lodash'
import { left, right, Either } from 'fp-ts/lib/Either'
// export const fetchTodos = () => new Promise<TodosById>(resolve => setTimeout(() => resolve(todosById), 0))

export const fetchTodos = async (): Promise<Either<Error, TodosById>> => {
    try {
        const response = await fetch('https://jsonplaceholder.typicode.com/todos')
        const json = await response.json()
        const todos = json.map((rawTodo: any) => ({
            id: rawTodo.id,
            name: `${rawTodo.title}`
                .split(' ')
                .map((w: string) => _.capitalize(w))
                .join(' '),
            completed: rawTodo.completed,
        }))

        const todosById = _.keyBy(_.slice(todos, 0, 5), 'id') as TodosById

        return right(todosById)
    } catch (error) {
        return left(error)
    }
}
