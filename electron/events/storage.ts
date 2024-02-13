import { ipcMain } from 'electron'
import { storage } from '../storage'

export function attachStorageEvents() {
  ipcMain.handle('storage:get', (_, key: string) => {
    return storage.get(key)
  })
  ipcMain.handle('storage:set', (_, key: string, value: unknown) => {
    storage.set(key, value)
  })
}
