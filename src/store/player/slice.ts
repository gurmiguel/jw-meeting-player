import type { PayloadAction } from '@reduxjs/toolkit'
import { createSlice } from '@reduxjs/toolkit'
import { MediaTypes } from '../../../shared/models/MediaTypes'
import { PlayerState } from '../../../shared/state'

export const initialState: PlayerState = {
  file: null,
  type: null,
  playState: 'pause',
  playRate: 1,
  currentTime: 0,
  duration: 0,
  zoomLevel: 1,
  position: { top: 0, left: 0 },
}

export const playerSlice = createSlice({
  name: 'player',
  initialState,
  reducers: {
    start(state, action: PayloadAction<NonNullableObject<Pick<PlayerState, 'file' | 'content' | 'type'>>>) {
      state.file = action.payload.file
      state.content = action.payload.content
      state.type = action.payload.type
      state.playState = (<MediaTypes[]>['audio', 'video']).includes(action.payload.type) ? 'play' : 'pause'
      state.currentTime = initialState.currentTime
      state.duration = initialState.duration
    },
    stop() {
      return initialState
    },
    pause(state) {
      state.playState = 'pause'
    },
    play(state) {
      state.playState = 'play'
    },
    time(state, action: PayloadAction<{ currentTime: number, duration?: number }>) {
      state.currentTime = action.payload.currentTime
      if (action.payload.duration !== undefined)
        state.duration = action.payload.duration
    },
    playRate(state, action: PayloadAction<number>) {
      state.playRate = action.payload
    },
    zoomLevel(state, action: PayloadAction<Pick<PlayerState, 'zoomLevel' | 'position'>>) {
      state.zoomLevel = action.payload.zoomLevel
      state.position = action.payload.position
    },
    toggleZoomScreen() {
      //
    },
    verseChange(_, _action: PayloadAction<{ verse: number, scroll?: boolean }>) {
      //
    },
  },
})

export const playerActions = playerSlice.actions

export default playerSlice.reducer
