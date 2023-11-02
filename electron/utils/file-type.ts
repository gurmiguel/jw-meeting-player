import { fileTypeStream } from 'file-type/core'
import fs from 'node:fs'
import { MediaTypes } from '../../shared/models/MediaTypes'

export async function decideFileMediaType(filepath: string): Promise<MediaTypes> {
  const stream = await fileTypeStream(fs.createReadStream(filepath))
  const res = stream.fileType

  try {
    if (res?.mime.startsWith('image')) return 'image'
    if (res?.mime.startsWith('video')) return 'video'
    if (res?.mime.startsWith('audio')) return 'audio'

    return 'image'
  } finally {
    stream.destroy()
  }
}
