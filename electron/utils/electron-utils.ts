import { app } from 'electron'
import path from 'path'
import packageJson from '../../package.json'

export function isDev() {
  if (app?.isPackaged !== undefined) {
    return !app.isPackaged
  }

  if (typeof process.execPath === 'string') {
    const execFileName = path.basename(process.execPath).toLowerCase()
    return execFileName.startsWith('electron')
  }

  return process.env.NODE_ENV === 'development'
    || process.env.ELECTRON_IS_DEV === '1'
}

export function getNameAndVersion() {
  let name = app.name
  let version = app.getVersion()

  if (name.toLowerCase() === 'electron') {
    name = ''
    version = ''
  }

  if (name && version) {
    return { name, version }
  }

  if (!name) {
    name = packageJson.name
  }

  if (!version) {
    version = packageJson.version
  }

  if (!name) {
    // Fallback, otherwise file transport can't be initialized
    name = 'Electron'
  }

  return { name, version }
}
