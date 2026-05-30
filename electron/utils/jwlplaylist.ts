import log from 'electron-log/main'
import JSZip from 'jszip'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import sqlite from 'sqlite3'
import type Downloader from '../api/Downloader'
import { CrawlerUtils } from '../api/crawler/CrawlerUtils'
import { getTempDir } from './dirs'

type MediaFile = {
  path: string
  name: string
}

const JWPUB_CONTEXT = 'jwpub-temp'

export async function* extractMediaFromJWLPlaylist(playlistFile: string, downloader: Downloader): AsyncGenerator<MediaFile> {
  const targetDir = path.join(getTempDir(), JWPUB_CONTEXT)
  await fs.promises.mkdir(targetDir, { recursive: true })

  const unzipped = await JSZip.loadAsync(await fs.promises.readFile(playlistFile))

  const dbfile = await unzipped.file('userData.db')?.async('nodebuffer')

  if (!dbfile)
    throw new Error('Could not load the database for the file')

  const utils = new CrawlerUtils(downloader, [])
  const playlist = await getFilesPlaylistFromDB(dbfile, utils)

  for (const item of playlist) {
    if (item.downloaded) {
      yield { path: item.path, name: item.label || path.basename(item.path) }
      continue
    }
    
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

async function getFilesPlaylistFromDB(dbfile: Buffer, utils: CrawlerUtils) {
  const tempfile = path.join(getTempDir(), JWPUB_CONTEXT, crypto.randomBytes(16).toString('hex') + '.db')
  try {
    await fs.promises.writeFile(tempfile, dbfile)

    const db = new sqlite.Database(tempfile)

    interface Media {
      id: number
      label: string | null
      path: string
      mimeType: string
      downloaded?: boolean
    }

    interface WebMultimedia {
      id: number
      mimeType: string
      keySymbol: string
      track: number | null
    }

    const mediaItems = await new Promise<Media[]>((resolve, reject) => {
      db.serialize(() => {
        const items = new Array<Media>()
        let failed = false
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
        `, (_, row) => {
          items.push(row)
        }, (err) => {
          failed = !!err
          if (err) return reject(err)
        })
        
        if (failed) return
        
        db.each<WebMultimedia>(`
          SELECT LocationId as id, 'video/mp4' as mimeType, KeySymbol as keySymbol, Track as track
          FROM Location
          WHERE KeySymbol IS NOT NULL AND KeySymbol != 'sjjm'
            AND Track IS NOT NULL
          ORDER BY LocationId
        `, async (_, row) => {
          const media = await utils.fetchPublicationVideo(utils.generateDataVideoURL(row.keySymbol, row.track ?? 1))
          if (!media) return
          items.push({
            id: row.id,
            label: media.title,
            mimeType: row.mimeType,
            path: media.path,
            downloaded: true,
          })
        }, (err) => {
          failed = !!err
          if (err) return reject(err)
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
