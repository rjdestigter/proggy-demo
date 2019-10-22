import { createStore, applyMiddleware } from 'redux'
import logger from 'redux-logger'
import createSagaMiddleware from 'redux-saga'
import { createEpicMiddleware } from 'redux-observable'
import enhanceStoreWithDetachableReducers from '../modules/detachable-reducers'

const sagaMiddleware = createSagaMiddleware()
const epicMiddleware = createEpicMiddleware()

const voidReducer = () => ({})

const store = createStore(voidReducer, applyMiddleware(logger, epicMiddleware, sagaMiddleware))

const storeWithDetachableReducers = enhanceStoreWithDetachableReducers(store)

export default Object.assign({ runSaga: sagaMiddleware.run, runEpic: epicMiddleware.run }, storeWithDetachableReducers)
