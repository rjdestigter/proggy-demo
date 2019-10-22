import { Todos } from '../types'
import * as React from 'react'

const styleCompleted = {
    color: 'LimeGreen',
    maxWidth: 150,
}

const styleIncomplete = {
    maxWidth: 150,
}

export const ListOfTodos = (props: { todos: Todos }) => {
    const elTodos = props.todos.map(todo => {
        return (
            <li style={todo.completed ? styleCompleted : styleIncomplete} key={todo.id}>
                {todo.name}
            </li>
        )
    })

    return <ul>{elTodos}</ul>
}

export default ListOfTodos
