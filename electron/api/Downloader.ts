import $transliterate from '@sindresorhus/transliterate'
import { net, session } from 'electron'
import log from 'electron-log/main'
import { randomUUID } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { delay } from '../../shared/utils'
import { getJWLibraryVideosDir } from '../utils/dirs'
import { decideFileMediaType } from '../utils/file-type'
import { generateThumbnail, isVideoFile } from '../utils/video-utils'
import { windows } from '../windows'
import { FileSystemService } from './FileSystemService'

const transliterate = ($transliterate as any).__esModule
  ? ($transliterate as any).default as typeof $transliterate
  : $transliterate

export class Downloader extends FileSystemService {
  protected downloadQueue: Array<{ targetPath: string, url: string, thumbnail: string | null }> = []

  async enqueue(url: string, type: string) {
    let filename = ''
    if (url.startsWith('data:'))
      filename = randomUUID()
    else
      filename = url.split(url.startsWith('http') ? '/' : path.sep).pop()!

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
      const filename = path.basename(targetPath)
    
      if (url.startsWith('data:')) {
        await fs.promises.writeFile(targetPath, url.replace(/^data:[\w]+\/[\w-+.]+;base64,/, ''), 'base64')
      } else {
        const file = fs.createWriteStream(targetPath)
  
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
          log.debug('Downloading from:', url.slice(0, 150))
          const jwlibraryCopyFile = url.match(/(jw\.org|akamaihd\.net)/i) && thumbnail !== null
            ? fs.createWriteStream(path.join(getJWLibraryVideosDir(), filename))
            : null
          
          const request = net.request({
            method: 'GET',
            url,
            redirect: 'follow',
            session: session.defaultSession,
          })

          await new Promise<void>((resolve, reject) => {
            request.on('response', (response) => {
              const { statusCode, statusMessage, headers } = response
              if (statusCode >= 400)
                return reject(new Error(`Failed to download media: ${statusCode} - ${statusMessage}`)) 
              
              const contentSize = parseInt(headers['content-length']?.toString() ?? '0')
  
              if (contentSize) {
                let downloadedSize = 0
                response.on('data', (chunk: Buffer) => {
                  if (jwlibraryCopyFile)
                    jwlibraryCopyFile.write(chunk)
                  file.write(chunk)

                  downloadedSize += chunk.byteLength
                  updateProgress(filename, Math.min(98, downloadedSize * 100 / contentSize))
                })
              }

              response.on('end', () => {
                jwlibraryCopyFile?.end()
                file.end()
                delay(500)
                  .then(() => updateProgress(filename, 100))
                  .then(resolve)
              })

              response.on('error', (err) => {
                file.destroy()
                jwlibraryCopyFile?.destroy()
                reject(err)
              })
            })

            request.on('error', reject)
            request.end()
          })
        }
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
