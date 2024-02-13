import { BrowserWindow } from 'electron'
import { attachApiEvents } from './api'
import { attachPlayerEvents } from './player'
import { attachStorageEvents } from './storage'
import { attachWindowEvents } from './window'

export function attachEvents(main: BrowserWindow, player: BrowserWindow) {
  attachStorageEvents()
  attachPlayerEvents(main, player)
  attachWindowEvents()
  attachApiEvents()
}
