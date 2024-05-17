import { BrowserWindow, ipcMain } from 'electron'
import { playerWindowLoad, windows } from '../windows'

export function attachWindowEvents() {
  ipcMain.on('window-show', (e) => {
    const { sender } = e

    const window = BrowserWindow.getAllWindows().find(win => win.webContents.id === sender.id)!

    window.showInactive()
  })

  ipcMain.on('request-player-window', async (e) => {
    const { sender } = e

    await playerWindowLoad.unwrap()

    sender.send('set-feedback-source', { sourceId: windows.player.getMediaSourceId() })
  })
}
