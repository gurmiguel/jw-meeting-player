import { addMinutes, format as formatDate } from 'date-fns'
import log from 'electron-log/main'
import { isEqual, isUndefined, omitBy, unionWith } from 'lodash'
import { nanoid } from 'nanoid/non-secure'
import nodepath from 'node:path'
import { UploadingFile } from '../../shared/models/UploadMedia'
import { WeekType } from '../../shared/models/WeekType'
import { extractMediaFromJWLPlaylist } from '../utils/jwlplaylist'
import { extractMediaFromJWPUB } from '../utils/jwpub'
import MetadataLoader from './MetadataLoader'
import { Uploader } from './Uploader'
import { ParsedMedia, ProcessedResult } from './crawler/types'

export async function uploadMedia(date: Date, type: WeekType, files: UploadingFile[]) {
  date = addMinutes(date, date.getTimezoneOffset())

  log.info('Uploading files for date:', formatDate(date, 'yyyy-MM-dd'))

  const uploader = new Uploader()
  uploader.setContext(formatDate(date, 'yyyy-w') + `--${type + 1}`)

  const metadataLoader = new MetadataLoader(uploader)
  const loadedMetadata = await metadataLoader.loadMetadata()

  let uploadedItems: ProcessedResult[] = []
  try {
    uploadedItems = Array.from(await Promise.all(files.flatMap<Promise<ProcessedResult[]>>(async function mapFiles({ file, group, label }) {
      const filepath_l = file.path.toLowerCase()
      const extension = filepath_l.split('.').pop()

      const processed = new Array<ProcessedResult>()
      switch (extension) {
        case 'jwpub':
          for await (const item of extractMediaFromJWPUB(file.path)) {
            processed.push(...await mapFiles.apply(this, [{
              file: {
                name: nodepath.basename(item.path),
                path: item.path,
              },
              group,
              label: item.name,
            }]))
          }
          return processed
        case 'jwlplaylist':
          for await (const item of extractMediaFromJWLPlaylist(file.path))
            processed.push(...await mapFiles.apply(this, [{
              file: {
                name: nodepath.basename(item.path),
                path: item.path,
              },
              group,
              label: item.name,
            }]))
          return processed
      }

      const { path, thumbnail, type, duration } = await uploader.enqueue(file.path, file.name)

      const media: ProcessedResult['media'] = []
      media.push(omitBy({ path, type, duration, timestamp: Date.now(), downloadProgress: 100 }, isUndefined) as unknown as ParsedMedia)
      if (thumbnail)
        media.push({ path: thumbnail, type: 'image', timestamp: Date.now(), downloadProgress: 100 })

      return [{
        uid: nanoid(),
        group,
        label,
        alt: label,
        type,
        media,
        manual: true,
      }]
    }))).flat()
  } finally {
    log.info('Starting to upload')
    const count = await uploader.flush()
    log.info(`Uploaded ${count} media items`)
  }
  const mergedResults = unionWith(loadedMetadata, uploadedItems, (a, b) => {
    return isEqual(a,b)
  })
  if (mergedResults.length > 0)
    await metadataLoader.saveMetadata(mergedResults)
}
