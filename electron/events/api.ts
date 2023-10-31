import { ipcMain } from 'electron'
import { FetchWeekType } from '../../shared/models/FetchWeekData'
import { fetchWeekMedia } from '../crawler/fetch-week-media'

export function attachApiEvents() {
  ipcMain.handle('fetch-week-data', (_e, { isoDate, type, force }: APIEvents.FetchWeekMediaPayload) => {
    const date = new Date(isoDate)

    return fetchWeekMedia(date, type, force)
  })
}

export namespace APIEvents {
  export interface FetchWeekMediaPayload {
    isoDate: string
    type: FetchWeekType
    force?: boolean
  }

  export type FetchWeekMediaResponse = PromiseType<ReturnType<typeof fetchWeekMedia>>
}
