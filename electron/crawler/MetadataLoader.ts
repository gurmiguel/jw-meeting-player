import { readFile, writeFile } from 'fs/promises'
import path from 'path'
import { Downloader } from './Downloader'
import { ParsingResult } from './parser/types'

class MetadataLoader {
  static MATADATA_FILENAME = 'metadata.json'

  constructor(protected downloader: Downloader) {}

  get targetDir() {
    return this.downloader.targetDir
  }

  get targetPath() {
    return path.join(this.targetDir, MetadataLoader.MATADATA_FILENAME)
  }

  async loadMetadata() {
    try {
      console.log('Loading metadata from:', this.targetPath)
      const metadata = await readFile(this.targetPath, 'utf-8')
      return JSON.parse(metadata) as ParsingResult[]
    } catch {
      // do nothing
      return null
    }
  }

  async saveMetadata(results: ParsingResult[]) {
    await writeFile(this.targetPath, JSON.stringify(results))
  }
}

export default MetadataLoader
