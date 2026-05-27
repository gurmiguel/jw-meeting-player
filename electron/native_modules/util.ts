import { app } from 'electron'
import path from 'node:path'

export function getNativeModulePath(moduleName: string) {
  if (app.isPackaged) {
    return path.join(
      process.resourcesPath,
      'app.asar.unpacked/build/Release',
      `${moduleName}.node`,
    )
  }

  return path.join(__dirname, `../build/Release/${moduleName}.node`)
}
