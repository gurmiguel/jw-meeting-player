import log from 'electron-log/main'
import { fileTypeStream } from 'file-type/core'
import fs from 'node:fs'
import path from 'node:path'
import { MediaTypes } from '../../shared/models/MediaTypes'
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
  }

  protected async ensureDirectoryIsCreated(dir: string) {
    if (this.dirsCreated.has(dir)) return

    await fs.promises.mkdir(dir, { recursive: true })
    this.dirsCreated.add(dir)
  }

  protected async decideFileMediaType(filepath: string): Promise<MediaTypes> {
    const stream = await fileTypeStream(fs.createReadStream(filepath))
    const res = stream.fileType

    try {
      if (res?.mime.startsWith('image')) return 'image'
      if (res?.mime.startsWith('video')) return 'video'
      if (res?.mime.startsWith('audio')) return 'audio'
  
      return 'image'
    } finally {
      stream.destroy()
    }
  }

  abstract flush(): Promise<number>
}
