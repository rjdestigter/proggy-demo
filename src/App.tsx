import React from 'react'
import './App.css'
import listOfTodos from './apps/todos'
import store from './core/store'
import { Provider } from 'react-redux'

const styleShow = {
    border: '1px solid #fafafa',
    padding: 3,
    cursor: 'pointer',
}

const Show = (props: { children: React.ReactNode }) => {
    const [toggled, toggle] = React.useState(true)

    return (
        <div style={styleShow} onClick={() => toggle(!toggled)}>
            {toggled ? props.children : '...'}
        </div>
    )
}

const ListOfTodos1 = listOfTodos(0)
const ListOfTodos2 = listOfTodos(0)
const ListOfTodos3 = listOfTodos(0)
const ListOfTodos4 = listOfTodos(0)

const App: React.FC = () => {
    return (
        <div className="App">
            <header className="App-header">
                <Provider store={store}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Show>
                            <ListOfTodos3 />
                        </Show>
                        <Show>
                            <ListOfTodos4 />
                        </Show>
                        <Show>
                            <ListOfTodos1 />
                        </Show>
                        <Show>
                            <ListOfTodos2 />
                        </Show>
                    </div>
                    <br />
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Show>
                            <ListOfTodos1 />
                        </Show>
                        <Show>
                            <ListOfTodos2 />
                        </Show>
                        <Show>
                            <ListOfTodos3 />
                        </Show>
                        <Show>
                            <ListOfTodos4 />
                        </Show>
                    </div>
                    <br />
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Show>
                            <ListOfTodos3 />
                        </Show>
                        <Show>
                            <ListOfTodos4 />
                        </Show>
                        <Show>
                            <ListOfTodos1 />
                        </Show>
                        <Show>
                            <ListOfTodos2 />
                        </Show>
                    </div>
                </Provider>
            </header>
        </div>
    )
}

export default App
