import { none, Option, some, map as mapOption } from 'fp-ts/lib/Option'
import * as _ from 'lodash'
import * as React from 'react'
import Program from '../program'

type WithProgramState<T> = { ready: false } | { ready: true; output: T }

// A function, taking an Program and returning:
// A higher-order-component, returning
// A component that will render the given component
// once the Program program has run

/**
 * @param {Program: Program<T>} Program - The Program program we want run when the component mounts
 */
export default function withProgram<T>(program: Program<T>) {
    /**
     * @param Wrapped  - The component we're wrapping around
     * @param busyNode - Node rendered while the program is booting
     */
    return <P extends {}>(Wrapped: React.ComponentType<P>, busyNode: React.ReactNode = null) => {
        // Where it all comes together
        const displayName = `WithProgram(${Wrapped.displayName || Wrapped.name || 'Component'})`

        return class WithProgram extends React.PureComponent<P, WithProgramState<T>> {
            public static displayName = displayName

            private withProgramIsMounted = false

            public state: WithProgramState<T> = { ready: false }

            private version = _.uniqueId()

            private task: Option<Program<T>> = none

            // Runs the damn thing and updates tate so that your component renders
            public componentDidMount() {
                // this.version = _.uniqueId()
                this.withProgramIsMounted = true

                this.task = some(
                    program.map(result => {
                        if (this.withProgramIsMounted) {
                            this.setState({ ready: true, output: result })
                        }

                        return result
                    }, `${displayName}-v${this.version}`),
                )

                mapOption((t: Program<T, any>) => t.start())(this.task)
            }

            public componentWillUnmount() {
                this.withProgramIsMounted = false
                mapOption((t: Program<T, any>) => t.stop())(this.task) //  this.task.map(t => t.stop())
            }

            public render() {
                if (this.state.ready === true) {
                    return <Wrapped {...this.props} />
                }

                return busyNode
            }
        }
    }
}
