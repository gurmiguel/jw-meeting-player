import log from 'electron-log/main'
import fs from 'node:fs'
import http from 'node:https'
import path from 'node:path'
import { JWLIBRARY_VIDEO_PATH } from '../paths'
import { decideFileMediaType } from '../utils/file-type'
import { generateThumbnail, isVideoFile } from '../utils/video-utils'
import { FileSystemService } from './FileSystemService'

export class Downloader extends FileSystemService {
  protected downloadQueue: Array<{ targetPath: string, url: string, thumbnail: string | null }> = []

  async enqueue(url: string, type: string) {
    let filename = url.split('/').pop()!

    if (!filename.endsWith(`.${type}`))
      filename += `.${type}`
    
    const targetPath = path.join(this.targetDir, filename)
    const thumbnail = isVideoFile(targetPath)
      ? path.join(this.targetDir, filename.replace(/\.[^\.]+$/i, '-thumb.png'))
      : null

    await this.ensureDirectoryIsCreated(this.targetDir)

    if (!this.downloadQueue.find(({ targetPath: path }) => path === targetPath))
      this.downloadQueue.push({ url, targetPath, thumbnail })

    return { path: targetPath, thumbnail }
  }

  async flush() {
    const downloads = await Promise.all(this.downloadQueue.map(async ({ targetPath, thumbnail, url }) => {
      const file = fs.createWriteStream(targetPath)

      const filename = path.basename(targetPath)

      try {
        await fs.promises.access(path.join(JWLIBRARY_VIDEO_PATH, filename))
        const readFile = fs.createReadStream(path.join(JWLIBRARY_VIDEO_PATH, filename))
        readFile.pipe(file)

        await new Promise<void>((resolve, reject) => {
          file.on('error', reject)
          file.on('finish', async () => {
            file.close()
            resolve()
          })
        })

        log.debug('Using existing file from JW Library', filename)
      } catch {
        await new Promise<void>(resolve => http.get(url, response => {
          response.pipe(file)
  
          file.on('finish', async () => {
            file.close()
            resolve()
          })
        }))
      }

      const type = await decideFileMediaType(targetPath)
      if (thumbnail && type === 'video')
        await generateThumbnail(targetPath, thumbnail)
          .catch((err: Error) => log.error(`Error generating thumbnail for "${thumbnail}":`, err))
    }))
    this.downloadQueue = []
    return downloads.length
  }
}

export default Downloader
