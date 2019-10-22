import todos from './reducer'
import { fetchTodos } from './api'

import { reduce, dispatch, runSaga } from '../../core/programs'
import { create, andThen, combine } from '../../modules/program'
import { appPrefix } from './constants'
import { load } from './actions'
import { TodosById } from './types'
import { fetchAndLoadMoreTodos } from './sagas'
import { fromTask } from '../../modules/redux-program'
import { Either, getOrElse } from 'fp-ts/lib/Either'

const createDispatchLoadTodosProgram = (eitherTodosById: Either<Error, TodosById>) => {
    const todosById: TodosById = getOrElse(() => ({}))(eitherTodosById)
    const dispatchLoadTodos = () => load(todosById)
    return dispatch(dispatchLoadTodos)
}

export const progReducer = reduce(appPrefix, todos)

export const progFetchTodos = create(fetchTodos)

export const progDispatchLoadTodos = progFetchTodos.chain(createDispatchLoadTodosProgram, 'loadTodosAfterFetch')

export const progSaga = runSaga(fetchAndLoadMoreTodos)

export const progSagaTask = fromTask(progSaga)

export const progLoadTodosAndSaga = combine(progSagaTask, progDispatchLoadTodos)

export const progTodos = andThen(progReducer, progLoadTodosAndSaga)
