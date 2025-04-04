import { fileTypeFromStream } from 'file-type/node'
import fs from 'node:fs'
import { MediaTypes } from '../../shared/models/MediaTypes'

export async function decideFileMediaType(filepath: string): Promise<MediaTypes> {
  const stream = fs.createReadStream(filepath)
  const res = await fileTypeFromStream(stream)

  try {
    if (res?.mime.startsWith('image')) return 'image'
    if (res?.mime.startsWith('video')) return 'video'
    if (res?.mime.startsWith('audio')) return 'audio'

    return 'image'
  } finally {
    stream.destroy()
  }
}
