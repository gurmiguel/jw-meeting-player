import { log, warn } from 'electron-log/main'
import JSZip from 'jszip'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import sqlite from 'sqlite3'
import Downloader from '../api/Downloader'
import { CrawlerUtils } from '../api/crawler/CrawlerUtils'
import { getTempDir } from './dirs'

export type JWPubMediaFile = {
  path: string
  name: string
}

export type JWPubTalk = {
  documentId: number
  title: string
}

const JWPUB_CONTEXT = 'jwpub-temp'
const S34_DATABASE_FILE = 'S-34mp_T.db'

export async function getS34TalksFromJWPUB(jwpubFile: string): Promise<JWPubTalk[] | null> {
  if (!jwpubFile.toLowerCase().endsWith('.jwpub')) return null

  const unzippedJwpub = await JSZip.loadAsync(await fs.promises.readFile(jwpubFile))
  const contentsFile = await unzippedJwpub.file('contents')?.async('nodebuffer')
  if (!contentsFile)
    throw new Error('Could not open JWPUB file contents')

  const unzippedContents = await JSZip.loadAsync(contentsFile)
  const dbFile = await unzippedContents.file(S34_DATABASE_FILE)?.async('nodebuffer')
  if (!dbFile) return null

  return withDatabase(dbFile, async db => {
    const talks = await queryAll<JWPubTalk>(db, `
      SELECT d.DocumentId AS documentId, d.TocTitle AS title
      FROM Document d
      INNER JOIN DocumentMultimedia dm ON dm.DocumentId = d.DocumentId
      WHERE d.TocTitle IS NOT NULL
        AND TRIM(d.TocTitle) <> ''
      GROUP BY d.DocumentId, d.TocTitle
      ORDER BY d.DocumentId
    `)

    return talks.map(it => ({
      ...it,
      title: it.title.replace(/^N[.°º]+\s*/g, '').trim(),
    }))
  })
}

export async function* extractMediaFromJWPUB(jwpubFile: string, downloader: Downloader, talkDocumentId?: number): AsyncGenerator<JWPubMediaFile> {
  const targetDir = path.join(getTempDir(), JWPUB_CONTEXT)
  await fs.promises.mkdir(targetDir, { recursive: true })

  const isJWPubFile = jwpubFile.toLowerCase().endsWith('.jwpub')

  const unzippedJwpub = await JSZip.loadAsync(await fs.promises.readFile(jwpubFile))

  let unzippedContents: JSZip | undefined

  const localMediaFiles = await (async () => {
    if (!isJWPubFile) {
      return unzippedJwpub.filter(filename =>
        /\.(png|jpe?g|gif|mp4|ogg|opus|mp3)$/i.test(filename) &&
        !/default_thumbnail/i.test(filename),
      )
    }
    const contentsFile = await unzippedJwpub.file('contents')?.async('nodebuffer')

    if (!contentsFile)
      throw new Error('Could not open JWPUB file contents')

    unzippedContents = await JSZip.loadAsync(contentsFile)

    return unzippedContents.filter(filename => !filename.endsWith('.db'))
  })()

  if (talkDocumentId !== undefined) {
    const dbFile = await unzippedContents?.file(S34_DATABASE_FILE)?.async('nodebuffer')
    if (!dbFile)
      throw new Error('Could not open the S-34 database for the selected talk')

    const utils = new CrawlerUtils(downloader, [])
    yield* extractTalkMediaFromDb(dbFile, unzippedContents!, targetDir, talkDocumentId, utils)
    return
  }
  

  for (const file of localMediaFiles) {
    const targetPath = path.join(targetDir, file.name)
    const buffer = await file.async('nodebuffer')

    await fs.promises.writeFile(targetPath, buffer)

    yield { path: targetPath, name: path.basename(targetPath) }
  }

  if (!isJWPubFile)
    return

  const dbFiles = unzippedContents?.filter(filename => filename.endsWith('.db')) ?? []

  const utils = new CrawlerUtils(downloader, [])

  for (const file of dbFiles) {
    const fileBuffer = await file.async('nodebuffer')
    if (!fileBuffer) return
  
    for await (const mediaFile of fetchMediaFilesFromDb(fileBuffer, utils, localMediaFiles.map(file => path.basename(file.name))))
      yield mediaFile
  }
}

async function* fetchMediaFilesFromDb(dbfile: Buffer, utils: CrawlerUtils, ignoreFiles: string[]): AsyncGenerator<JWPubMediaFile> {
  interface WebMultimedia {
    Id: number
    MimeType: string
    KeySymbol: string
    Track: number | null
  }

  const mediaItems = await withDatabase(dbfile, async db => {
    return await queryAll<WebMultimedia>(db, `
        SELECT MultimediaId as Id, MimeType, KeySymbol, Track
        FROM Multimedia
        WHERE KeySymbol IS NOT NULL
          AND FilePath NOT IN (${ignoreFiles.map(it => `"${it}"`).join(', ')})
        ORDER BY MultimediaId
    `)
  })

  log('will fetch media', mediaItems)
  for (const item of mediaItems) {
    const media = await utils.fetchPublicationVideo(utils.generateDataVideoURL(item.KeySymbol, item.Track ?? 1))

    if (!media) continue
  
    yield { path: media.path, name: media.title }
  }
}

type TalkMedia = {
  documentMultimediaId: number
  filePath: string | null
  keySymbol: string | null
  track: number | null
}

async function* extractTalkMediaFromDb(
  dbfile: Buffer,
  contents: JSZip,
  targetDir: string,
  talkDocumentId: number,
  utils: CrawlerUtils,
): AsyncGenerator<JWPubMediaFile> {
  const mediaItems = await withDatabase(dbfile, async db => {
    return await queryAll<TalkMedia>(db, `
      SELECT
        dm.DocumentMultimediaId AS documentMultimediaId,
        m.FilePath AS filePath,
        m.KeySymbol AS keySymbol,
        m.Track AS track
      FROM DocumentMultimedia dm
      INNER JOIN Multimedia m ON m.MultimediaId = dm.MultimediaId
      WHERE dm.DocumentId = ?
      ORDER BY dm.DocumentMultimediaId
    `, [talkDocumentId])
  })

  if (!mediaItems.length)
    throw new Error('The selected talk does not contain media')

  const processed = new Set<string>()
  for (const item of mediaItems) {
    const key = item.keySymbol
      ? `remote:${item.keySymbol}:${item.track ?? 1}`
      : `local:${item.filePath ?? ''}`
    if (processed.has(key)) continue

    const localFile = item.filePath ? contents.file(item.filePath) : null
    if (localFile) {
      processed.add(key)
      const targetPath = path.join(targetDir, localFile.name)
      await fs.promises.writeFile(targetPath, await localFile.async('nodebuffer'))
      yield { path: targetPath, name: path.basename(targetPath) }
      continue
    }

    if (!item.keySymbol) {
      warn('Could not find local media referenced by selected talk', item.filePath)
      continue
    }

    processed.add(key)
    const media = await utils.fetchPublicationVideo(utils.generateDataVideoURL(item.keySymbol, item.track ?? 1))
    if (media)
      yield { path: media.path, name: media.title }
  }
}

async function withDatabase<T>(dbfile: Buffer, callback: (db: sqlite.Database) => Promise<T>): Promise<T> {
  await fs.promises.mkdir(path.join(getTempDir(), JWPUB_CONTEXT), { recursive: true })
  const tempfile = path.join(getTempDir(), JWPUB_CONTEXT, crypto.randomBytes(16).toString('hex') + '.db')
  await fs.promises.writeFile(tempfile, dbfile)

  const db = new sqlite.Database(tempfile)
  try {
    return await callback(db)
  } finally {
    await new Promise<void>(resolve => db.close(() => resolve()))
    await fs.promises.rm(tempfile, { force: true })
  }
}

function queryAll<T>(db: sqlite.Database, query: string, params: unknown[] = []): Promise<T[]> {
  return new Promise((resolve, reject) => {
    db.all<T>(query, params, (err, rows) => {
      if (err) return reject(err)
      resolve(rows)
    })
  })
}
