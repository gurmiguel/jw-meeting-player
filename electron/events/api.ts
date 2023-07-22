import { ipcMain } from 'electron'
import { fetchWeekMedia } from '../crawler/fetch-week-media'

export function attachApiEvents() {
  ipcMain.handle('fetch-week-data', (_e, { isoDate }: APIEvents.FetchWeekMediaPayload) => {
    const date = new Date(isoDate)

    return fetchWeekMedia(date)
  })
}

export namespace APIEvents {
  export interface FetchWeekMediaPayload {
    isoDate: string
  }

  export type FetchWeekMediaResponse = PromiseType<ReturnType<typeof fetchWeekMedia>>
}
