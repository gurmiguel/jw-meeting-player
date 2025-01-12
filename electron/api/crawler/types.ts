import { MediaTypes } from '../../../shared/models/MediaTypes'

export interface ParsedMedia {
  type: MediaTypes
  path: string
  downloadProgress: number
  timestamp: number
  duration?: number
}

export interface ParsedText {
  type: 'text'
  booknum: number
  chapter: number
  verses: number[]
  content: string
  audioURL: string
  duration: number
  markers: Array<{ verseNumber: number, startTime: string, duration: string }>
}

export type ParsingResult = {
  uid: string
  group: string
  alt: string
  label: string
} & ({
  type: Exclude<MediaTypes, 'text'>
  media: ParsedMedia[]
} | {
  type: 'text'
  media: ParsedText[]
})

export type ProcessedResult = ParsingResult & {
  manual: boolean
}
