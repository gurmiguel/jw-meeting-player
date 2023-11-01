import ReactDOM from 'react-dom/client'
import { Provider } from 'react-redux'
import { DialogProvider } from './components/Dialog/DialogProvider.tsx'
import MainApp from './components/MainApp.tsx'
import './index.css'
import { store } from './store/index.ts'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement)
  .render((
    <Provider store={store}>
      <DialogProvider>
        <MainApp />
      </DialogProvider>
    </Provider>
  ))

postMessage({ payload: 'removeLoading' }, '*')
