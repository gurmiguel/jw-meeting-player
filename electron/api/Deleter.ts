import fs from 'node:fs'
import path from 'node:path'
import { FileSystemService } from './FileSystemService'

export class Deleter extends FileSystemService {
  protected deleteQueue: Array<{ targetPath: string }> = []

  async enqueue(filename: string) {
    const targetPath = path.join(this.targetDir, filename)
    
    if (!this.deleteQueue.find(({ targetPath: path }) => path === targetPath))
      this.deleteQueue.push({ targetPath })

    console.log('Enqueued file to delete', targetPath)

    return { path: targetPath }
  }

  async flush() {
    const deletes = await Promise.all(this.deleteQueue.map(async ({ targetPath }) => {
      await fs.promises.unlink(targetPath).catch(() => {})
    }))
    return deletes.length
  }

}
