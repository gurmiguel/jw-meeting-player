import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import Player from './components/Player.tsx'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <Player />
  </React.StrictMode>,
)

postMessage({ payload: 'removeLoading' }, '*')
