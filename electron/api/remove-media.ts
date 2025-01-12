import { addMinutes, format as formatDate } from 'date-fns'
import log from 'electron-log/main'
import path from 'node:path'
import { WeekType } from '../../shared/models/WeekType'
import { Deleter } from './Deleter'
import MetadataLoader from './MetadataLoader'
import { ParsedMedia, ProcessedResult } from './crawler/types'

export async function removeMedia(item: ProcessedResult, date: Date, type: WeekType) {
  date = addMinutes(date, date.getTimezoneOffset())

  log.info('Deleting file for date:', formatDate(date, 'yyyy-MM-dd'))

  const deleter = new Deleter()
  deleter.setContext(formatDate(date, 'yyyy-w') + `--${type + 1}`)
  
  const metadataLoader = new MetadataLoader(deleter)
  const loadedMetadata = await metadataLoader.loadMetadata()
  
  try {
    await Promise.all((item.media as ParsedMedia[]).map(async media => {
      await deleter.enqueue(path.basename(media.path))
    }))
  } finally {
    log.info('Starting to delete')
    const count = await deleter.flush()
    log.info(`Deleted ${count} media items`)
  }
  
  await metadataLoader.saveMetadata(loadedMetadata?.filter(it => it.uid !== item.uid) ?? [])
}
