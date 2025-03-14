export interface JWApiResponse<T, Formats extends string, Langs extends string = 'T'> {
  pubName: string
  parentPubName: string | null
  booknum: number | null
  pub: string
  issue: string
  formattedDate: string
  filterformat: string[]
  track: number | null
  specialty: string
  pubImage: JWAsset
  languages: Record<Langs, {
    name: string
    direction: string
    locale: string
    script: string
  }>
  files: Record<Langs,
    Record<Formats, Array<T>>
  >
}

export interface MediaResponse {
  title: string
  file: JWAsset & {
    stream: string
  }
  filesize: number
  trackImage: JWAsset
  markers: {
    mepsLanguageSpoken: string
    mepsLanguageWritten: string
    documentId: number
    markers: Array<{
      duration: string
      startTime: string
      mepsParagraphId: number
    }>
    type: string
    hash: string
    introduction: {
      duration: string
      startTime: string
    }
  }
  label: string
  track: number
  hasTrack: boolean
  pub: string
  docid: number
  booknum: number
  mimetype: string
  edition: string
  editionDescr: string
  format: string
  formatDescr: string
  specialty: string
  specialtyDescr: string
  subtitled: boolean
  frameWidth: number
  frameHeight: number
  frameRate: number
  duration: number
  bitRate: number
}

export interface JWAsset {
  url: string
  stream: string
  modifiedDatetime: string
  checksum: string | null
}
