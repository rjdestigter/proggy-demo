import { delay, put } from 'redux-saga/effects'
import * as _ from 'lodash'

import { todos } from './mocks'
import { load } from './actions'

export function* fetchAndLoadMoreTodos() {
    const data = todos.map(todo => {
        return {
            ...todo,
            name: `${todo.name} (saga)`,
            id: _.uniqueId(),
        }
    })

    const action = load(_.keyBy(data, 'id'))

    yield delay(Math.random() * 10000)

    yield put(action)
}
