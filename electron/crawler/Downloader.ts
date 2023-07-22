import fs from 'node:fs'
import http from 'node:https'
import path from 'node:path'
import { FILES_PATH } from '../paths'

class Downloader {
  private currentContext!: string
  private dirsCreated = new Set<string>()
  private downloadQueue: Array<{ path: string, url: string }> = []
  
  setContext(ctx: string) {
    this.currentContext = ctx
  }

  async enqueue(url: string, type: string) {
    let filename = url.split('/').pop()!

    if (!filename.endsWith(`.${type}`))
      filename += `.${type}`
    
    const targetDir = path.join(FILES_PATH, this.currentContext)
    const targetPath = path.join(targetDir, filename)

    await this.ensureDirectoryIsCreated(targetDir)

    if (!this.downloadQueue.find(({ path }) => path === targetPath))
      this.downloadQueue.push({ url, path: targetPath })

    return targetPath
  }

  async flush() {
    await Promise.all(this.downloadQueue.map(async ({ path, url }) => {
      const file = fs.createWriteStream(path)
      await new Promise<void>(resolve => http.get(url, response => {
        response.pipe(file)

        file.on('finish', () => {
          file.close()
          resolve()
        })
      }))
    }))
  }

  protected async ensureDirectoryIsCreated(dir: string) {
    if (this.dirsCreated.has(dir)) return

    await fs.promises.mkdir(dir, { recursive: true })
    this.dirsCreated.add(dir)
  }
}

const downloader = new Downloader()

export default downloader
