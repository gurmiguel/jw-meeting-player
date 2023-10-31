import { MediaTypes } from '../../../shared/models/MediaTypes'

export interface ParsedMedia {
  type: MediaTypes
  path: string
}

export interface ParsingResult {
  group: string
  label: string
  type: MediaTypes
  media: ParsedMedia[]
}
