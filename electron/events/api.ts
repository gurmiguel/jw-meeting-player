import { ipcMain } from 'electron'
import { RemoveMediaRequest } from '../../shared/models/RemoveMedia'
import { UploadMediaRequest } from '../../shared/models/UploadMedia'
import { WeekType } from '../../shared/models/WeekType'
import { fetchWeekMedia } from '../api/fetch-week-media'
import { removeMedia } from '../api/remove-media'
import { uploadMedia } from '../api/upload-media'

export function attachApiEvents() {
  ipcMain.handle('fetch-week-data', (_e, { isoDate, type, force }: APIEvents.FetchWeekMediaPayload) => {
    const date = new Date(isoDate)

    return fetchWeekMedia(date, type, force)
  })
  ipcMain.handle('upload-media', (_e, { isoDate, type, files }: APIEvents.UploadMediaPayload) => {
    const date = new Date(isoDate)

    return uploadMedia(date, type, files)
  })
  ipcMain.handle('remove-media', (_e, { isoDate, type, item }: APIEvents.RemoveMediaPayload) => {
    const date = new Date(isoDate)

    return removeMedia(item, date, type)
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
}
