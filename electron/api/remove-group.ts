import { addMinutes, format as formatDate } from 'date-fns'
import log from 'electron-log/main'
import { WeekType } from '../../shared/models/WeekType'
import { Deleter } from './Deleter'
import MetadataLoader from './MetadataLoader'
import { ParsedMedia } from './crawler/types'

export async function removeGroup(group: string, date: Date, type: WeekType) {
  date = addMinutes(date, date.getTimezoneOffset())

  log.info('Deleting group files for date:', formatDate(date, 'yyyy-MM-dd'), 'group:', group)

  const deleter = new Deleter()
  deleter.setContext(formatDate(date, 'yyyy-w') + `--${type + 1}`)

  const metadataLoader = new MetadataLoader(deleter)
  const loadedMetadata = await metadataLoader.loadMetadata()
  const groupItems = loadedMetadata?.filter(it => it.group === group) ?? []

  try {
    await Promise.all(groupItems.flatMap(item =>
      (item.media as ParsedMedia[]).map(media => deleter.enqueue(media.path))
    ))
  } finally {
    log.info('Starting to delete')
    const count = await deleter.flush()
    log.info(`Deleted ${count} media items`)
  }

  await metadataLoader.saveMetadata(loadedMetadata?.filter(it => it.group !== group) ?? [])
}
