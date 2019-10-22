import * as React from 'react'

import logo from './logo.svg'

const loadingStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
}

export const LoadingSpinner = ({ size = 100, children }: { size?: number; children: React.ReactNode }) => {
    return (
        <div style={loadingStyle}>
            <img src={logo} className="App-logo" alt="logo" style={{ width: `${size}%`, height: `${size}%` }} />
            <div>{children}</div>
        </div>
    )
}

export default LoadingSpinner
