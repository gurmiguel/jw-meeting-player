import { MediaTypes } from '../../../shared/models/MediaTypes'

export interface ParsedMedia {
  type: MediaTypes
  path: string
  downloadProgress: number
  timestamp: number
  duration?: number
}

export interface ParsingResult {
  uid: string
  group: string
  alt: string
  label: string
  type: MediaTypes
  media: ParsedMedia[]
}

export interface ProcessedResult extends ParsingResult {
  manual: boolean
}
