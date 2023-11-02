import { app } from 'electron'
import os from 'node:os'
import path from 'node:path'

export function getAppData(platform: NodeJS.Platform) {
  const appData = app.getPath('appData')
  if (appData) {
    return appData
  }

  const home = getHome()

  switch (platform) {
    case 'darwin': {
      return path.join(home, 'Library/Application Support')
    }

    case 'win32': {
      return process.env.APPDATA || path.join(home, 'AppData/Roaming')
    }

    default: {
      return process.env.XDG_CONFIG_HOME || path.join(home, '.config')
    }
  }
}

export function getHome() {
  return os.homedir ? os.homedir() : process.env.HOME!
}

export function getLibraryDir(platform: NodeJS.Platform, appName: string) {
  if (platform === 'darwin') {
    return path.join(getHome(), 'Library', appName)
  }

  return path.join(getUserData(platform, appName))
}

export function getUserData(platform: NodeJS.Platform, appName: string) {
  if (app.name !== appName) {
    return path.join(getAppData(platform), appName)
  }

  return app.getPath('userData')
    || path.join(getAppData(platform), appName)
}
