import { WeekType } from './WeekType'

export interface RemoveGroupRequest {
  isoDate: string
  type: WeekType
  group: string
}
