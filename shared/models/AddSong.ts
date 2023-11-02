import { WeekType } from './WeekType'

export interface AddSongRequest {
  isoDate: string
  type: WeekType
  group: string
  song: number
}
