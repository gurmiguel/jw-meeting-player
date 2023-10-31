import type { PayloadAction } from '@reduxjs/toolkit'
import { createSlice } from '@reduxjs/toolkit'
import { PlayerState } from '../../../shared/state'

const initialState: PlayerState = {
  file: null,
  type: null,
  playState: 'pause',
  playRate: 1,
  currentTime: 0,
  duration: 0,
}

export const playerSlice = createSlice({
  name: 'player',
  initialState,
  reducers: {
    start(state, action: PayloadAction<NonNullableObject<Pick<PlayerState, 'file' | 'type'>>>) {
      state.file = action.payload.file
      state.type = action.payload.type
      state.playState = action.payload.type !== 'image' ? 'play' : 'pause'
      state.currentTime = initialState.currentTime
      state.duration = initialState.duration
    },
    stop(state) {
      Object.assign(state, initialState)
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
  },
})

export const playerActions = playerSlice.actions

export default playerSlice.reducer
