import ReactDOM from 'react-dom/client'
import Player from './components/Player.tsx'
import './index.css'
import './jw-fonts.css'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(<Player />)

postMessage({ payload: 'removeLoading' }, '*')
