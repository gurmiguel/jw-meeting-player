import { addMinutes, format as formatDate } from 'date-fns'
import { isEqual, unionWith } from 'lodash'
import { UploadingFile } from '../../shared/models/UploadMedia'
import { WeekType } from '../../shared/models/WeekType'
import MetadataLoader from './MetadataLoader'
import { Uploader } from './Uploader'
import { ProcessedResult } from './parser/types'

export async function uploadMedia(date: Date, type: WeekType, files: UploadingFile[]) {
  date = addMinutes(date, date.getTimezoneOffset())

  console.log('Uploading files for date:', formatDate(date, 'yyyy-MM-dd'))

  const uploader = new Uploader()
  uploader.setContext(formatDate(date, 'yyyy-w') + `--${type + 1}`)

  const metadataLoader = new MetadataLoader(uploader)
  const loadedMetadata = await metadataLoader.loadMetadata()

  let uploadedItems: ProcessedResult[] = []
  try {
    uploadedItems = await Promise.all(files.map<Promise<ProcessedResult>>(async ({ file, group, label }) => {
      const { path, thumbnail, type } = await uploader.enqueue(file.path, file.name)

      const media: ProcessedResult['media'] = []
      media.push({ path, type })
      if (thumbnail !== path)
        media.push({ path: thumbnail, type: 'image' })

      return {
        group,
        label,
        type,
        media,
        manual: true,
      }
    }))
  } finally {
    console.log('Starting to upload')
    const count = await uploader.flush()
    console.log(`Uploaded ${count} media items`)
  }
  const mergedResults = unionWith(loadedMetadata, uploadedItems, (a, b) => {
    return isEqual(a,b)
  })
  if (mergedResults.length > 0)
    await metadataLoader.saveMetadata(mergedResults)

  return mergedResults
}