import { IpcMainInvokeEvent, ipcMain } from 'electron'
import log from 'electron-log/main'
import { AddSongRequest } from '../../shared/models/AddSong'
import { RemoveMediaRequest } from '../../shared/models/RemoveMedia'
import { UploadMediaRequest } from '../../shared/models/UploadMedia'
import { WeekType } from '../../shared/models/WeekType'
import { addSong } from '../api/add-song'
import { fetchWeekMedia } from '../api/fetch-week-media'
import { removeMedia } from '../api/remove-media'
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
}

function createApiHandler<T>(endpoint: string, handler: (e: IpcMainInvokeEvent, params: T) => Promise<unknown>) {
  ipcMain.handle(endpoint, async (e, params: T) => {
    try {
      log.debug('Initiating Request: [EVENT]', endpoint)
      
      return await handler(e, params)
    } catch (err) {
      return err
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
}
