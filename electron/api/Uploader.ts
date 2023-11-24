import log from 'electron-log/main'
import fs from 'node:fs'
import path from 'node:path'
import { Readable } from 'node:stream'
import { decideFileMediaType } from '../utils/file-type'
import { generateThumbnail, getMediaDuration } from '../utils/video-utils'
import { FileSystemService } from './FileSystemService'

export class Uploader extends FileSystemService {
  protected uploadQueue: Array<{ targetPath: string, file: Readable, thumbnail: string | null }> = []

  async enqueue(sourcePath: string, filename: string) {
    const file = fs.createReadStream(sourcePath)

    const targetPath = path.join(this.targetDir, filename)
    const type = await decideFileMediaType(sourcePath)
    const thumbnail = type === 'video'
      ? path.join(this.targetDir, filename.replace(/\.[^\.]+$/i, '-thumb.png'))
      : null

    await this.ensureDirectoryIsCreated(this.targetDir)

    const duration = ['video', 'audio'].includes(type)
      ? await getMediaDuration(sourcePath)
      : undefined

    if (!this.uploadQueue.find(({ targetPath: path }) => path === targetPath))
      this.uploadQueue.push({ file, targetPath, thumbnail })

    log.info('Enqueued file to upload', targetPath)

    return { path: targetPath, thumbnail, type, duration }
  }

  async flush() {
    const uploads = await Promise.all(this.uploadQueue.map(async ({ targetPath, file: sourceFile, thumbnail }) => {
      const file = fs.createWriteStream(targetPath)

      sourceFile.pipe(file)

      await new Promise<void>(resolve => {
        file.on('finish', async () => {
          file.close()
          if (thumbnail)
            await generateThumbnail(targetPath, thumbnail)
              .catch((err: Error) => log.error(`Error generating thumbnail for "${thumbnail}":`, err))
          resolve()
        })
      })
    }))
    this.uploadQueue = []
    return uploads.length
  }

}
