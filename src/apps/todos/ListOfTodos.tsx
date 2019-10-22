import * as React from 'react'

import { connect } from 'react-redux'

import { todos } from './selectors'
import { progTodos } from './program'
import withProgram from '../../modules/react-program/withProgram'

import ListOfTodos from './components/ListOfTodos'
import LoadingSpinner from '../loading-spinner'
import { andThen, delay } from '../../modules/program'

const mapStateToProps = (state: any) => {
    return {
        todos: todos(state),
    }
}

const container = connect(mapStateToProps)

export default (m = 250) =>
    withProgram(andThen(delay(m, m), progTodos))(
        container(ListOfTodos),
        <LoadingSpinner size={50}>Busy: {m}</LoadingSpinner>,
    )
