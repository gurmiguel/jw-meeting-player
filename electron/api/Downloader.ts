import transliterate from '@sindresorhus/transliterate'
import log from 'electron-log/main'
import fs from 'node:fs'
import http from 'node:https'
import path from 'node:path'
import { getJWLibraryVideosDir } from '../utils/dirs'
import { decideFileMediaType } from '../utils/file-type'
import { generateThumbnail, isVideoFile } from '../utils/video-utils'
import { windows } from '../windows'
import { FileSystemService } from './FileSystemService'

export class Downloader extends FileSystemService {
  protected downloadQueue: Array<{ targetPath: string, url: string, thumbnail: string | null }> = []

  async enqueue(url: string, type: string) {
    let filename = url.split(url.startsWith('http') ? '/' : path.sep).pop()!

    filename = transliterate(filename)
      .replace(/[^a-z0-9_\-\s\+.]/gi, '')
      .replace(/\s+/g, '-')

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
        if (thumbnail === null) {
          throw new Error('Only try to fetch existing JW Library video files')
        }

        await fs.promises.access(path.join(getJWLibraryVideosDir(), filename))
        const readFile = fs.createReadStream(path.join(getJWLibraryVideosDir(), filename))
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
        log.debug('Downloading from:', url)
        const jwlibraryCopyFile = url.match(/(jw\.org|akamaihd\.net)/i)
          ? fs.createWriteStream(path.join(getJWLibraryVideosDir(), filename))
          : null

        await new Promise<void>(resolve => http.get(url, response => {
          const contentSize = parseInt(response.headers['content-length'] ?? '0')
          if (jwlibraryCopyFile)
            response.pipe(jwlibraryCopyFile)
          response.pipe(file)
  
          if (contentSize) {
            let downloadedSize = 0
            response.on('data', (chunk: Buffer) => {
              downloadedSize += chunk.byteLength
              // during progress, only update until 98%, so thumbnail is sure to be loaded on 100%
              updateProgress(filename, Math.min(98, downloadedSize * 100 / contentSize))
            })
          }
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

      updateProgress(filename, 100)
    }))
    this.downloadQueue = []
    return downloads.length
  }
}

export default Downloader

function updateProgress(path: string, progress: number) {
  windows.main.webContents.send(`media-progress/${path}`, { progress })
}
