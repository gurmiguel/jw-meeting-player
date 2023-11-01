import { WeekType } from './WeekType'

export interface FetchWeekDataRequest {
  isoDate: string
  type: WeekType
  forceSeed?: number
}
