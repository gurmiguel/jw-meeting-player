import { ProcessedResult } from '../../electron/api/parser/types'
import { WeekType } from './WeekType'

export interface UploadingFile extends Pick<ProcessedResult, 'group' | 'label'> {
  file: {
    path: string
    name: string
  }
}

export interface UploadMediaRequest {
  isoDate: string
  type: WeekType
  files: UploadingFile[]
  forceSeed?: number
}
