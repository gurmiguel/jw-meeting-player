import { type BrowserWindow } from 'electron'

export const windows = {
  main: null as unknown as BrowserWindow,
  player: null as unknown as BrowserWindow,
}

export const alwaysOnTopState = {
  main: false,
  player: false,
}
