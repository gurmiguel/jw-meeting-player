import { BrowserWindow, ipcMain } from 'electron'

export function attachPlayerEvents(main: BrowserWindow, player: BrowserWindow) {
  registerTwoWayEvent('start')
  registerTwoWayEvent('playerControl')
  registerTwoWayEvent('stop')

  function registerTwoWayEvent<E extends EventNames, Payload = Parameters<PlayerBridge[E]>[0]>(
    eventName: E,
    mainHandler?: (payload: Payload) => void,
  ) {
    ipcMain.on(`player:${eventName}`, (event, payload: Payload) => {
      const { sender } = event
      const target = [main, player].find(win => win.webContents.id !== sender.id)!
      target.webContents.send(`player:${eventName}`, payload)

      mainHandler?.(payload)
    })
  }
}

export namespace PlayerEvents {
  export interface Start {
    type: 'video' | 'image' | 'audio'
    file: string
  }

  export interface PlayerControl {
    action: 'play' | 'pause'
  }
}