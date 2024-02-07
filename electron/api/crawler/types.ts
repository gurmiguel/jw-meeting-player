import { MediaTypes } from '../../../shared/models/MediaTypes'

export interface ParsedMedia {
  type: MediaTypes
  path: string
  duration?: number
}

export interface ParsingResult {
  group: string
  label: string
  type: MediaTypes
  media: ParsedMedia[]
}

export interface ProcessedResult extends ParsingResult {
  manual: boolean
}
