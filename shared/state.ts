import { MediaTypes } from './models/MediaTypes'

export interface PlayerState {
  file: string | null
  type: MediaTypes | null
  playState: 'play' | 'pause'
  playRate: number
  currentTime: number
  duration: number
}
