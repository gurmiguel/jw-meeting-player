import fs from 'node:fs'
import path from 'node:path'
import { Readable } from 'node:stream'
import { MediaTypes } from '../../shared/models/MediaTypes'
import { generateThumbnail, isVideoFile } from '../utils/thumbnails'
import { FileSystemService } from './FileSystemService'

export class Uploader extends FileSystemService {
  protected uploadQueue: Array<{ targetPath: string, file: Readable, thumbnail: string }> = []

  async enqueue(sourcePath: string, filename: string) {
    const file = fs.createReadStream(sourcePath)

    const targetPath = path.join(this.targetDir, filename)
    const thumbnail = path.join(this.targetDir, filename.replace(/\.mp4/i, '-thumb.png'))

    await this.ensureDirectoryIsCreated(this.targetDir)

    if (!this.uploadQueue.find(({ targetPath: path }) => path === targetPath))
      this.uploadQueue.push({ file, targetPath, thumbnail })

    console.log('Enqueued file to upload', targetPath)

    const type: MediaTypes = await this.decideFileMediaType(sourcePath)

    return { path: targetPath, thumbnail, type }
  }

  async flush() {
    const uploads = await Promise.all(this.uploadQueue.map(async ({ targetPath, file: sourceFile, thumbnail }) => {
      const file = fs.createWriteStream(targetPath)

      sourceFile.pipe(file)

      await new Promise<void>(resolve => {
        file.on('finish', async () => {
          file.close()
          if (isVideoFile(targetPath))
            await generateThumbnail(targetPath, thumbnail)
              .catch((err: Error) => console.log(`Error generating thumbnail for ${path.basename(targetPath)}:`, err.message))
          resolve()
        })
      })
    }))
    return uploads.length
  }

}