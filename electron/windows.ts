import { BrowserWindow } from 'electron'
import { Deferred } from '../shared/utils'

export const windows = {
  main: null as unknown as BrowserWindow,
  player: null as unknown as BrowserWindow,
}

export const alwaysOnTopState = {
  main: false,
  player: false,
}

export let playerWindowLoad = new Deferred()
