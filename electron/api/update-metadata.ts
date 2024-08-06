import { format as formatDate } from 'date-fns'
import log from 'electron-log/main'
import { WeekType } from '../../shared/models/WeekType'
import Downloader from './Downloader'
import MetadataLoader from './MetadataLoader'
import { ProcessedResult } from './crawler/types'

export async function updateMetadata(date: Date, type: WeekType, metadata: ProcessedResult[]) {
  const downloader = new Downloader()
  downloader.setContext(formatDate(date, 'yyyy-w') + `--${type + 1}`)

  const metadataLoader = new MetadataLoader(downloader)
  await metadataLoader.saveMetadata(metadata)

  log.info('Updated metadata', metadataLoader.targetPath)
}
