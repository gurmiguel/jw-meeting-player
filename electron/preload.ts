import { contextBridge, ipcRenderer } from 'electron'

const windowLoaded = new Promise(res => window.onload = res)

function eventHandler<E extends EventNames>(namespace: string, eventName: E) {
  type EventParameters = Parameters<PlayerBridge[E]>
  type Payload = EventParameters extends Array<any> ? EventParameters[0] : never
  return {
    [eventName]: (payload: Payload) => ipcRenderer.send(`${namespace}:${eventName}`, payload),
    ['on' + eventName[0].toUpperCase() + eventName.slice(1)]: (callback: IpcRendererCallback<Payload>) => {
      ipcRenderer.on(`${namespace}:${eventName}`, callback)
  
      return () => ipcRenderer.removeListener(`${namespace}:${eventName}`, callback)
    }
  }
}

contextBridge.exposeInMainWorld('bridge', {
  ...eventHandler('player', 'start'),
  ...eventHandler('player', 'playerControl'),
  ...eventHandler('player', 'stop'),
  ...eventHandler('player', 'setSpeed'),
})

contextBridge.exposeInMainWorld('common', <CommonBridge>{
  windowShow: () => ipcRenderer.send('window-show'),
})

contextBridge.exposeInMainWorld('api', <API>{
  fetchWeekMedia: (payload) => ipcRenderer.invoke('fetch-week-data', payload)
})

ipcRenderer.once('port', async (event) => {
  await windowLoaded
  
  window.postMessage('set-port', '*', event.ports)
})

ipcRenderer.once('set-feedback-source', async (_event, { sourceId }: { sourceId: string }) => {
  await windowLoaded

  window.postMessage({ type: 'set-feedback-source', sourceId })
})

function domReady(condition: DocumentReadyState[] = ['complete', 'interactive']) {
  return new Promise(resolve => {
    if (condition.includes(document.readyState)) {
      resolve(true)
    } else {
      document.addEventListener('readystatechange', () => {
        if (condition.includes(document.readyState)) {
          resolve(true)
        }
      })
    }
  })
}

const safeDOM = {
  append(parent: HTMLElement, child: HTMLElement) {
    if (!Array.from(parent.children).find(e => e === child)) {
      parent.appendChild(child)
    }
  },
  remove(parent: HTMLElement, child: HTMLElement) {
    if (Array.from(parent.children).find(e => e === child)) {
      parent.removeChild(child)
    }
  },
}

/**
 * https://tobiasahlin.com/spinkit
 * https://connoratherton.com/loaders
 * https://projects.lukehaas.me/css-loaders
 * https://matejkustec.github.io/SpinThatShit
 */
function useLoading() {
  const className = `loaders-css__square-spin`
  const styleContent = `
@keyframes square-spin {
  25% { transform: perspective(100px) rotateX(180deg) rotateY(0); }
  50% { transform: perspective(100px) rotateX(180deg) rotateY(180deg); }
  75% { transform: perspective(100px) rotateX(0) rotateY(180deg); }
  100% { transform: perspective(100px) rotateX(0) rotateY(0); }
}
.${className} > div {
  animation-fill-mode: both;
  width: 50px;
  height: 50px;
  background: #fff;
  animation: square-spin 3s 0s cubic-bezier(0.09, 0.57, 0.49, 0.9) infinite;
}
.app-loading-wrap {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #282c34;
  z-index: 9;
}
    `
  const oStyle = document.createElement('style')
  const oDiv = document.createElement('div')

  oStyle.id = 'app-loading-style'
  oStyle.innerHTML = styleContent
  oDiv.className = 'app-loading-wrap'
  oDiv.innerHTML = `<div class="${className}"><div></div></div>`

  return {
    appendLoading() {
      safeDOM.append(document.head, oStyle)
      safeDOM.append(document.body, oDiv)
    },
    removeLoading() {
      safeDOM.remove(document.head, oStyle)
      safeDOM.remove(document.body, oDiv)
    },
  }
}

// ----------------------------------------------------------------------

const { appendLoading, removeLoading } = useLoading()
domReady().then(appendLoading)

window.onmessage = ev => {
  ev.data.payload === 'removeLoading' && removeLoading()
}

setTimeout(removeLoading, 4999)
