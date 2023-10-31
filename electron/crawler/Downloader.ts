import fs from 'node:fs'
import http from 'node:https'
import path from 'node:path'
import { FILES_PATH } from '../paths'
import { generateThumbnail } from '../utils/thumbnails'

export class Downloader {
  private currentContext!: string
  private dirsCreated = new Set<string>()
  private downloadQueue: Array<{ targetPath: string, url: string, thumbnail: string }> = []

  get targetDir() {
    return path.join(FILES_PATH, this.currentContext)
  }
  
  setContext(ctx: string) {
    this.currentContext = ctx

    console.log('Target downloads directory:', `"${this.targetDir}"`)
  }

  async enqueue(url: string, type: string) {
    let filename = url.split('/').pop()!

    if (!filename.endsWith(`.${type}`))
      filename += `.${type}`
    
    const targetPath = path.join(this.targetDir, filename)
    const thumbnail = path.join(this.targetDir, filename.replace(/\.mp4/i, '-thumb.png'))

    await this.ensureDirectoryIsCreated(this.targetDir)

    if (!this.downloadQueue.find(({ targetPath: path }) => path === targetPath))
      this.downloadQueue.push({ url, targetPath, thumbnail })

    return { path: targetPath, thumbnail }
  }

  async flush() {
    const downloads = await Promise.all(this.downloadQueue.map(async ({ targetPath, thumbnail, url }) => {
      const file = fs.createWriteStream(targetPath)

      await new Promise<void>(resolve => http.get(url, response => {
        response.pipe(file)

        file.on('finish', async () => {
          file.close()
          if (targetPath.endsWith('.mp4'))
            await generateThumbnail(targetPath, thumbnail)
              .catch((err: Error) => console.log(`Error generating thumbnail for ${path.basename(targetPath)}:`, err.message))
          resolve()
        })
      }))
    }))

    return downloads.length
  }

  protected async ensureDirectoryIsCreated(dir: string) {
    if (this.dirsCreated.has(dir)) return

    await fs.promises.mkdir(dir, { recursive: true })
    this.dirsCreated.add(dir)
  }
}

export default Downloader
