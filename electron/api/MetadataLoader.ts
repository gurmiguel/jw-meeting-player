import log from 'electron-log/main'
import { readFile, writeFile } from 'fs/promises'
import path from 'path'
import { FileSystemService } from './FileSystemService'
import { ProcessedResult } from './crawler/types'

class MetadataLoader {
  static MATADATA_FILENAME = 'metadata.json'

  constructor(protected fileSystemService: FileSystemService) {}

  get targetDir() {
    return this.fileSystemService.targetDir
  }

  get targetPath() {
    return path.join(this.targetDir, MetadataLoader.MATADATA_FILENAME)
  }

  async loadMetadata(isForcing = false) {
    try {
      log.info('Loading metadata from:', this.targetPath)
      const metadata = await readFile(this.targetPath, 'utf-8')
      const loadedMetadata = JSON.parse(metadata) as ProcessedResult[]

      return isForcing
        ? loadedMetadata.filter(it => it.manual === true)
        : loadedMetadata
    } catch {
      // do nothing
      return null
    }
  }

  async saveMetadata(results: ProcessedResult[]) {
    await writeFile(this.targetPath, JSON.stringify(results))
  }
}

export default MetadataLoader
