import { fileTypeFromStream } from 'file-type/core'
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

    console.log('Target directory:', `"${this.targetDir}"`)
  }

  protected async ensureDirectoryIsCreated(dir: string) {
    if (this.dirsCreated.has(dir)) return

    await fs.promises.mkdir(dir, { recursive: true })
    this.dirsCreated.add(dir)
  }

  protected async decideFileMediaType(filepath: string): Promise<MediaTypes> {
    const res = await fileTypeFromStream(fs.createReadStream(filepath))
    if (res?.mime.startsWith('image')) return 'image'
    if (res?.mime.startsWith('video')) return 'video'
    if (res?.mime.startsWith('audio')) return 'audio'

    return 'image'
  }

  abstract flush(): Promise<number>
}
