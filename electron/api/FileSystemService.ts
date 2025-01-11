import log from 'electron-log/main'
import fs from 'node:fs'
import path from 'node:path'
import { FILES_PATH } from '../paths'

export abstract class FileSystemService {
  protected currentContext!: string
  protected dirsCreated = new Set<string>()

  get targetDir() {
    return path.join(FILES_PATH, this.currentContext)
  }
  
  setContext(ctx: string) {
    this.currentContext = ctx

    log.info('Target directory:', `"${this.targetDir}"`)

    return this
  }

  async ensureDirectoryIsCreated(dir: string) {
    if (this.dirsCreated.has(dir)) return

    await fs.promises.mkdir(dir, { recursive: true })
    this.dirsCreated.add(dir)
  }

  abstract flush(): Promise<number>
}
