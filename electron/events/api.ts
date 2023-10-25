import { ipcMain } from 'electron'
import { FetchWeekType } from '../../shared/models/FetchWeekData'
import { fetchWeekMedia } from '../crawler/fetch-week-media'

export function attachApiEvents() {
  ipcMain.handle('fetch-week-data', (_e, { isoDate, type }: APIEvents.FetchWeekMediaPayload) => {
    const date = new Date(isoDate)

    return fetchWeekMedia(date, type)
  })
}

export namespace APIEvents {
  export interface FetchWeekMediaPayload {
    isoDate: string
    type: FetchWeekType
  }

  export type FetchWeekMediaResponse = PromiseType<ReturnType<typeof fetchWeekMedia>>
}
