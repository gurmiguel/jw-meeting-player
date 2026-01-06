import { contextBridge, ipcRenderer, webUtils } from 'electron'
import { getFilesOrder } from './utils/filesystem'

const windowLoaded = new Promise(res => window.onload = res)

function eventHandler<E extends EventNames>(namespace: string, eventName: E) {
  type EventParameters = Parameters<PlayerBridge[E]>
  type Payload = EventParameters extends Array<any> ? EventParameters[0] : never
  const channel = `${namespace}:${eventName}`
  return {
    [eventName]: (payload: Payload) => {
      ipcRenderer.send(channel, payload)
      window.postMessage({ channel, payload })
    },
    ['on' + eventName[0].toUpperCase() + eventName.slice(1)]: (callback: IpcRendererCallback<Payload>) => {
      ipcRenderer.on(channel, ipcCallback)
      window.addEventListener('message', onWindowMessage)
      function ipcCallback(_: unknown, payload: Payload) {
        return callback(payload)
      }
      function onWindowMessage({ data }: MessageEvent<{ channel: string, payload: Payload }>) {
        if (!data || data.channel !== channel) return

        callback(data.payload)
      }
  
      return () => {
        ipcRenderer.off(channel, ipcCallback)
        window.removeEventListener('message', onWindowMessage)
      }
    },
  }
}

contextBridge.exposeInMainWorld('bridge', {
  ...eventHandler('player', 'start'),
  ...eventHandler('player', 'stop'),
  ...eventHandler('player', 'playerControl'),
  ...eventHandler('player', 'setSpeed'),
  ...eventHandler('player', 'time'),
  ...eventHandler('player', 'seek'),
  ...eventHandler('player', 'zoom'),
  ...eventHandler('player', 'toggleZoomScreen'),
  ...eventHandler('player', 'zoomScreenNotFound'),
  ...eventHandler('player', 'verseChange'),
  ...eventHandler('player', 'displayCleaningGroup'),
  ...eventHandler('player', 'hideCleaningGroup'),
})

contextBridge.exposeInMainWorld('common', <CommonBridge>{
  windowShow: () => ipcRenderer.send('window-show'),
  requestPlayerWindow: () => ipcRenderer.send('request-player-window'),
  platform: process.platform,
  storage: {
    async get(key: string) {
      return await ipcRenderer.invoke('storage:get', key)
    },
    async set(key, value) {
      ipcRenderer.invoke('storage:set', key, value)
    },
  },
  getPathForFile: webUtils.getPathForFile.bind(webUtils),
  getFilesSorted: getFilesOrder,
})

contextBridge.exposeInMainWorld('api', <API>{
  async fetch(endpoint, payload) {
    const response = await ipcRenderer.invoke(endpoint, payload)

    if (response?.error)
      throw response.error

    return response
  },
  listen(topic, handler) {
    function listener(_: unknown, data: any) {
      handler(data)
    }

    ipcRenderer.on(topic, listener)
    return () => ipcRenderer.removeListener(topic, listener)
  },
})

ipcRenderer.on('port', async (event) => {
  await windowLoaded
  
  window.postMessage('set-port', '*', event.ports)
})

ipcRenderer.on('set-feedback-source', async (_event, { sourceId }: { sourceId: string }) => {
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
  const className = 'loaders-css__square-spin'
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
domReady().then(() => {
  if (document.body.querySelector('meta[name="x-no-loader"]')?.getAttribute('content') !== 'true')
    appendLoading()
})

window.onmessage = ev => {
  ev.data.payload === 'removeLoading' && removeLoading()
}

setTimeout(removeLoading, 4999)
