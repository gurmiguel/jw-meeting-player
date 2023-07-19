import { BrowserWindow, ipcMain } from 'electron'

export function attachWindowEvents() {
  ipcMain.on('window-show', (e) => {
    const { sender } = e

    const window = BrowserWindow.getAllWindows().find(win => win.webContents.id === sender.id)!

    window.showInactive()
  })
}
