import ReactDOM from 'react-dom/client'
import MainApp from './components/MainApp.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(<MainApp />)

postMessage({ payload: 'removeLoading' }, '*')
