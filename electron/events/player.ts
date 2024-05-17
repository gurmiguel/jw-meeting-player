import { BrowserWindow, ipcMain } from 'electron'
import { PlayerState } from '../../shared/state'
import { trySetPlayerAlwaysOnTop } from '../utils/player-display'
import { alwaysOnTopState } from '../windows'

export function attachPlayerEvents(main: BrowserWindow, player: BrowserWindow) {
  let stopDebounce: ReturnType<typeof setTimeout>
  registerTwoWayEvent('start', () => {
    clearTimeout(stopDebounce)
    alwaysOnTopState.player = true
    trySetPlayerAlwaysOnTop()
  })
  registerTwoWayEvent('stop', () => {
    clearTimeout(stopDebounce)
    stopDebounce = setTimeout(() => {
      alwaysOnTopState.player = false
      trySetPlayerAlwaysOnTop()
    }, 250)
  })
  registerTwoWayEvent('playerControl')
  registerTwoWayEvent('setSpeed')
  registerTwoWayEvent('time')
  registerTwoWayEvent('seek')
  registerTwoWayEvent('zoom')
  registerTwoWayEvent('toggleZoomScreen')
  registerTwoWayEvent('zoomScreenNotFound')

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

  export interface Zoom {
    zoomLevel: number
    top: number
    left: number
  }
}
