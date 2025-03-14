import { IpcMainInvokeEvent, ipcMain } from 'electron'
import log from 'electron-log/main'
import { AddSongRequest } from '../../shared/models/AddSong'
import { BibleIndex, BookChapter, Verse } from '../../shared/models/Bible'
import { RemoveMediaRequest } from '../../shared/models/RemoveMedia'
import { UploadMediaRequest } from '../../shared/models/UploadMedia'
import { WeekType } from '../../shared/models/WeekType'
import { addSong } from '../api/add-song'
import { fetchBibleVerses } from '../api/bible/fetch-verse'
import { getBibleIndex } from '../api/bible/get-index'
import { ProcessedResult } from '../api/crawler/types'
import { fetchWeekMedia } from '../api/fetch-week-media'
import { getYearText } from '../api/get-year-text'
import { getZoomScreen } from '../api/get-zoom-screen'
import { loadSongs } from '../api/load-songs'
import { removeMedia } from '../api/remove-media'
import { updateMetadata } from '../api/update-metadata'
import { uploadMedia } from '../api/upload-media'

export function attachApiEvents() {
  createApiHandler('fetch-week-data', (_e, { isoDate, type, force }: APIEvents.FetchWeekMediaPayload) => {
    const date = new Date(isoDate)

    return fetchWeekMedia(date, type, force)
  })
  createApiHandler('upload-media', (_e, { isoDate, type, files }: APIEvents.UploadMediaPayload) => {
    const date = new Date(isoDate)

    return uploadMedia(date, type, files)
  })
  createApiHandler('remove-media', (_e, { isoDate, type, item }: APIEvents.RemoveMediaPayload) => {
    const date = new Date(isoDate)

    return removeMedia(item, date, type)
  })
  createApiHandler('add-song', (_e, { isoDate, type, group, song }: APIEvents.AddSongPayload) => {
    const date = new Date(isoDate)

    return addSong(date, type, group, song)
  })
  createApiHandler('get-year-text', (_e, { year }: APIEvents.GetYearTextPayload) => {
    return getYearText(year)
  })
  createApiHandler('get-zoom-screen', () => {
    return getZoomScreen()
  })
  createApiHandler('update-metadata', (_e, { isoDate, type, metadata }: APIEvents.UpdateMetadataPayload) => {
    const date = new Date(isoDate)

    return updateMetadata(date, type, metadata)
  })
  createApiHandler('bible/index', (_e, { booknum, chapter }: APIEvents.GetBibleIndexPayload) => {
    return getBibleIndex(booknum, chapter)
  })
  createApiHandler('bible/verses', (_e, { booknum, chapter, verses }: APIEvents.FetchBibleVersesPayload) => {
    return fetchBibleVerses(booknum, chapter, verses)
  })
  createApiHandler('songs/load', () => {
    return loadSongs()
  })
}

function createApiHandler<T>(endpoint: string, handler: (e: IpcMainInvokeEvent, params: T) => Promise<unknown>) {
  ipcMain.handle(endpoint, async (e, params: T) => {
    try {
      log.info('======================')
      log.debug('Initiating Request: [EVENT]', endpoint)
      
      return await handler(e, params)
    } catch (err) {
      log.error(err)
      return { error: err }
    }
  })
}

export namespace APIEvents {
  export interface FetchWeekMediaPayload {
    isoDate: string
    type: WeekType
    force?: boolean
  }

  export type FetchWeekMediaResponse = PromiseType<ReturnType<typeof fetchWeekMedia>>
  
  export interface UploadMediaPayload extends UploadMediaRequest {}
  
  export type UploadMediaResponse = PromiseType<ReturnType<typeof uploadMedia>>

  export interface RemoveMediaPayload extends RemoveMediaRequest {}

  export type RemoveMediaResponse = PromiseType<ReturnType<typeof removeMedia>>

  export interface AddSongPayload extends AddSongRequest {}

  export type AddSongResponse = PromiseType<ReturnType<typeof addSong>>

  export interface GetYearTextPayload {
    year: number
  }

  export type GetYearTextResponse = PromiseType<ReturnType<typeof getYearText>>

  export type GetZoomScreenIdResponse = PromiseType<ReturnType<typeof getZoomScreen>>
  export interface UpdateMetadataPayload {
    isoDate: string
    type: WeekType
    metadata: ProcessedResult[]
  }

  export type UpdateMetadataResponse = PromiseType<ReturnType<typeof updateMetadata>>

  export type GetBibleIndexPayload = {
    booknum: never
    chapter: never
  } | {
    booknum: number
    chapter: never
  } | {
    booknum: number
    chapter: number
  }

  export type GetBibleIndexResponse = BibleIndex[] | BookChapter[] | Verse[]

  export interface FetchBibleVersesPayload {
    booknum: number
    chapter: number
    verses: number[]
  }
  
  export type FetchBibleVersesResponse = PromiseType<ReturnType<typeof fetchBibleVerses>>

  export type LoadSongsResponse = PromiseType<ReturnType<typeof loadSongs>>
}
