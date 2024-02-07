import { ProcessedResult } from '../../electron/api/crawler/types'
import { WeekType } from './WeekType'

export interface RemoveMediaRequest {
  isoDate: string
  type: WeekType
  item: ProcessedResult
}
