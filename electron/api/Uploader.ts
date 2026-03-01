import log from 'electron-log/main'
import fs from 'node:fs'
import path from 'node:path'
import { decideFileMediaType } from '../utils/file-type'
import { generateThumbnail, getMediaDuration } from '../utils/video-utils'
import { FileSystemService } from './FileSystemService'

export class Uploader extends FileSystemService {
  protected uploadQueue: Array<{ targetPath: string, sourcePath: string, thumbnail: string | null }> = []

  constructor (protected readonly mode: 'copy' | 'link' = 'link') {
    super()
  }

  async enqueue(sourcePath: string, filename: string) {
    const targetPath = this.mode === 'copy' ? path.join(this.targetDir, filename) : sourcePath
    const type = await decideFileMediaType(sourcePath)
    const thumbnail = type === 'video'
      ? path.join(this.targetDir, filename.replace(/\.[^\.]+$/i, '-thumb.png'))
      : null

    await this.ensureDirectoryIsCreated(this.targetDir)

    const duration = ['video', 'audio'].includes(type)
      ? await getMediaDuration(sourcePath)
      : undefined

    if (!this.uploadQueue.find(({ targetPath: path }) => path === targetPath))
      this.uploadQueue.push({ targetPath, sourcePath, thumbnail })

    log.info('Enqueued file to upload', targetPath)

    return { path: targetPath, thumbnail, type, duration }
  }

  async flush() {
    const uploads = await Promise.all(this.uploadQueue.map(async ({ targetPath, sourcePath, thumbnail }) => {
      if (this.mode === 'copy') {
        const sourceFile = fs.createReadStream(sourcePath)
        const file = fs.createWriteStream(targetPath)

        sourceFile.pipe(file)

        await new Promise<void>(resolve => {
          file.on('finish', async () => {
            file.close()
            resolve()
          })
        })
      }

      if (thumbnail)
        await generateThumbnail(targetPath, thumbnail)
          .catch((err: Error) => log.error(`Error generating thumbnail for "${thumbnail}":`, err))
    }))
    this.uploadQueue = []
    return uploads.length
  }

}
