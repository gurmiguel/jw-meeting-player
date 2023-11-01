import { addMinutes, format as formatDate } from 'date-fns'
import { isEqual } from 'lodash'
import path from 'node:path'
import { WeekType } from '../../shared/models/WeekType'
import { Deleter } from './Deleter'
import MetadataLoader from './MetadataLoader'
import { ProcessedResult } from './parser/types'

export async function removeMedia(item: ProcessedResult, date: Date, type: WeekType) {
  date = addMinutes(date, date.getTimezoneOffset())

  console.log('Deleting file for date:', formatDate(date, 'yyyy-MM-dd'))

  const deleter = new Deleter()
  deleter.setContext(formatDate(date, 'yyyy-w') + `--${type + 1}`)
  
  const metadataLoader = new MetadataLoader(deleter)
  const loadedMetadata = await metadataLoader.loadMetadata()
  
  try {
    await Promise.all(item.media.map(async media => {
      await deleter.enqueue(path.basename(media.path))
    }))
  } finally {
    console.log('Starting to delete')
    const count = await deleter.flush()
    console.log(`Deleted ${count} media items`)
  }
  
  const normalizedItem = {
    ...item,
    media: item.media.map(media => ({
      ...media,
      path: path.resolve(media.path),
    })),
  }
  await metadataLoader.saveMetadata(loadedMetadata?.filter(it => {
    return !isEqual(it, normalizedItem)
  }) ?? [])
}
