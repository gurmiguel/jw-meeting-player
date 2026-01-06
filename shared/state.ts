import { MediaTypes } from './models/MediaTypes'

export interface PlayerState {
  file: string | null
  content?: string
  type: MediaTypes | null
  playState: 'play' | 'pause'
  playRate: number
  currentTime: number
  duration: number
  zoomLevel: number
  position: { top: number, left: number }
  displayCleaningGroup: boolean
}

export type MediaItem = NonNullableObject<Pick<PlayerState, 'type' | 'file'>> & ({
  type: 'video' | 'image'
  thumbnail: string
} | {
  type: 'audio' | 'text'
})
