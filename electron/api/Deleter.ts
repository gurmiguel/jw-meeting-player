import log from 'electron-log/main'
import fs from 'node:fs'
import path from 'node:path'
import { FILES_PATH } from '../paths'
import { FileSystemService } from './FileSystemService'

export class Deleter extends FileSystemService {
  protected deleteQueue: Array<{ targetPath: string }> = []

  async enqueue(filepath: string) {
    const targetPath = filepath.match(/^[A-Z]:/) ? filepath : path.join(this.targetDir, filepath)
    const relativePath = path.relative(FILES_PATH, targetPath)
    
    if (!this.deleteQueue.find(({ targetPath: path }) => path === targetPath)
    // only delete files inside of app's local directories
    && relativePath && !relativePath.startsWith('..') && !path.isAbsolute(relativePath)) {
      this.deleteQueue.push({ targetPath })

      log.info('Enqueued file/folder to delete', targetPath)
    }

    return { path: targetPath }
  }

  async flush() {
    const deletes = await Promise.all(this.deleteQueue.map(async ({ targetPath }) => {
      try {
        fs.rmSync(targetPath, { recursive: true, force: true })
        await fs.promises.unlink(targetPath)
      } catch {}
    }))
    this.deleteQueue = []
    return deletes.length
  }

}
