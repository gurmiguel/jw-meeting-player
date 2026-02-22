import log from 'electron-log/main'
import path from 'node:path'
import { decideFileMediaType } from '../utils/file-type'
import { generateThumbnail, getMediaDuration } from '../utils/video-utils'
import { FileSystemService } from './FileSystemService'

export class Uploader extends FileSystemService {
  protected uploadQueue: Array<{ targetPath: string, thumbnail: string | null }> = []

  async enqueue(sourcePath: string, filename: string) {
    const targetPath = sourcePath
    const type = await decideFileMediaType(sourcePath)
    const thumbnail = type === 'video'
      ? path.join(this.targetDir, filename.replace(/\.[^\.]+$/i, '-thumb.png'))
      : null

    await this.ensureDirectoryIsCreated(this.targetDir)

    const duration = ['video', 'audio'].includes(type)
      ? await getMediaDuration(sourcePath)
      : undefined

    if (!this.uploadQueue.find(({ targetPath: path }) => path === targetPath))
      this.uploadQueue.push({ targetPath, thumbnail })

    log.info('Enqueued file to upload', targetPath)

    return { path: targetPath, thumbnail, type, duration }
  }

  async flush() {
    const uploads = await Promise.all(this.uploadQueue.map(async ({ targetPath, thumbnail }) => {
      if (thumbnail)
        await generateThumbnail(targetPath, thumbnail)
          .catch((err: Error) => log.error(`Error generating thumbnail for "${thumbnail}":`, err))
    }))
    this.uploadQueue = []
    return uploads.length
  }

}
