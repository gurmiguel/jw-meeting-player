import log from 'electron-log/main'
import JSZip from 'jszip'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import sqlite from 'sqlite3'
import { getTempDir } from './dirs'

type MediaFile = {
  path: string
  name: string
}

const JWPUB_CONTEXT = 'jwpub-temp'

export async function* extractMediaFromJWLPlaylist(playlistFile: string): AsyncGenerator<MediaFile> {
  const targetDir = path.join(getTempDir(), JWPUB_CONTEXT)
  await fs.promises.mkdir(targetDir, { recursive: true })

  const unzipped = await JSZip.loadAsync(await fs.promises.readFile(playlistFile))

  const dbfile = await unzipped.file('userData.db')?.async('nodebuffer')

  if (!dbfile)
    throw new Error('Could not load the database for the file')

  const playlist = await getFilesPlaylistFromDB(dbfile)

  for (const item of playlist) {
    const file = await unzipped.file(item.path)?.async('nodebuffer')
    if (!file) {
      log.error('Could not load file from playlist', { file: item.path })
      continue
    }

    const targetPath = path.join(targetDir, item.path)

    await fs.promises.writeFile(targetPath, file)

    yield { path: targetPath, name: item.label || path.basename(targetPath) }
  }
}

async function getFilesPlaylistFromDB(dbfile: Buffer) {
  const tempfile = path.join(getTempDir(), JWPUB_CONTEXT, crypto.randomBytes(16).toString('hex') + '.db')
  try {
    await fs.promises.writeFile(tempfile, dbfile)

    const db = new sqlite.Database(tempfile)

    interface Media {
      id: number
      label: string | null
      path: string
      mimeType: string
    }

    const mediaItems = await new Promise<Media[]>((resolve, reject) => {
      db.serialize(() => {
        const items = new Array<Media>()
        db.each<Media>(`
          SELECT DISTINCT
            pl.PlaylistItemId as id,
            pl.Label as label,
            im.FilePath as path,
            im.Mimetype as mimeType
          FROM IndependentMedia im
            INNER JOIN PlaylistItemIndependentMediaMap map ON im.IndependentMediaId = map.IndependentMediaId
            INNER JOIN PlaylistItem pl ON map.PlaylistItemId = pl.PlaylistItemId
            INNER JOIN TagMap tag ON pl.PlaylistItemId = tag.PlaylistItemId
          ORDER BY tag.Position ASC
        `, (err, row) => {
          if (err) return reject(err)
          items.push(row)
        }).wait(() => {
          resolve(items)
        })
      })
    })
    await new Promise(res => db.close(res))

    return mediaItems
  } finally {
    await fs.promises.unlink(tempfile)
  }
}
