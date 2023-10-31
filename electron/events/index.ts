import { BrowserWindow } from 'electron'
import { attachPlayerEvents } from './player'
import { attachWindowEvents } from './window'
import { attachApiEvents } from './api'

export function attachEvents(main: BrowserWindow, player: BrowserWindow) {
  attachPlayerEvents(main, player)
  attachWindowEvents()
  attachApiEvents()
}
