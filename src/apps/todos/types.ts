export type TodoId = string

export interface Todo {
    id: TodoId
    name: string
    completed: boolean
}

export type Todos = Todo[]

export type TodosById = { [todoId: string]: Todo }
