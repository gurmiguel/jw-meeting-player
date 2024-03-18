import { log } from 'electron-log/main'
import JSZip from 'jszip'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import sqlite from 'sqlite3'
import Downloader from '../api/Downloader'
import { CrawlerUtils } from '../api/crawler/CrawlerUtils'
import { getTempDir } from './dirs'

type MediaFile = {
  path: string
  name: string
}

const JWPUB_CONTEXT = 'jwpub-temp'

export async function* extractMediaFromJWPUB(jwpubFile: string): AsyncGenerator<MediaFile> {
  const targetDir = path.join(getTempDir(), JWPUB_CONTEXT)
  await fs.promises.mkdir(targetDir, { recursive: true })

  const unzippedJwpub = await JSZip.loadAsync(await fs.promises.readFile(jwpubFile))

  const contentsFile = await unzippedJwpub.file('contents')?.async('nodebuffer')

  if (!contentsFile)
    throw new Error('Could not open JWPUB file contents')

  const unzippedContents = await JSZip.loadAsync(contentsFile)

  const localMediaFiles = unzippedContents.filter(filename => !filename.endsWith('.db'))

  for (const file of localMediaFiles) {
    const targetPath = path.join(targetDir, file.name)
    const buffer = await file.async('nodebuffer')

    await fs.promises.writeFile(targetPath, buffer)

    yield { path: targetPath, name: path.basename(targetPath) }
  }

  const dbFiles = unzippedContents.filter(filename => filename.endsWith('.db'))

  for (const file of dbFiles) {
    const fileBuffer = await file.async('nodebuffer')
    if (!fileBuffer) return
  
    for await (const mediaFile of fetchMediaFilesFromDb(fileBuffer, localMediaFiles.map(file => path.basename(file.name))))
      yield mediaFile
  }
}

async function* fetchMediaFilesFromDb(dbfile: Buffer, ignoreFiles: string[]): AsyncGenerator<MediaFile> {
  const tempfile = path.join(getTempDir(), JWPUB_CONTEXT, crypto.randomBytes(16).toString('hex') + '.db')
  await fs.promises.writeFile(tempfile, dbfile)

  const db = new sqlite.Database(tempfile)

  interface Multimedia {
    Id: number
    MimeType: string
    KeySymbol: string
    Track: number | null
  }

  const mediaItems = await new Promise<Multimedia[]>((resolve, reject) => {
    db.serialize(() => {
      const items = new Array<Multimedia>()
      db.each<Multimedia>(`
        SELECT MultimediaId as Id, MimeType, KeySymbol, Track
        FROM Multimedia
        WHERE KeySymbol IS NOT NULL
          AND FilePath NOT IN (${ignoreFiles.map(it => `"${it}"`).join(', ')})
        ORDER BY MultimediaId
      `, (err, row) => {
        if (err) return reject(err)
        items.push(row)
      }).wait(() => {
        resolve(items)
      })
    })
  })

  const downloader = new Downloader()
  downloader.setContext(JWPUB_CONTEXT)

  const utils = new CrawlerUtils(downloader)

  log('will fetch media', mediaItems)
  for (const item of mediaItems) {
    const media = await utils.fetchPublicationVideo(utils.generateDataVideoURL(item.KeySymbol, item.Track ?? 1))

    if (!media) continue
  
    yield { path: media.path, name: media.title }
  }

  await downloader.flush()
}
