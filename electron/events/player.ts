import { BrowserWindow, ipcMain } from 'electron'
import { PlayerState } from '../../shared/state'

export function attachPlayerEvents(main: BrowserWindow, player: BrowserWindow) {
  registerTwoWayEvent('start')
  registerTwoWayEvent('stop')
  registerTwoWayEvent('playerControl')
  registerTwoWayEvent('setSpeed')
  registerTwoWayEvent('time')
  registerTwoWayEvent('seek')

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
  export interface Start extends Omit<PlayerState, 'duration'> {}

  export interface Stop {
    propagate?: boolean
  }

  export interface PlayerControl {
    action: 'play' | 'pause'
  }

  export interface SetSpeed {
    speed: number
  }

  export interface Time {
    current: number
    duration: number
  }

  export interface Seek {
    position: number
  }
}
