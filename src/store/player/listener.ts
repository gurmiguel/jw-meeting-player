import { createListenerMiddleware } from '@reduxjs/toolkit'
import { delay } from '../../lib/utils'
import { RootState } from '../index'
import { playerActions } from './slice'

export const playerListener = createListenerMiddleware()

playerListener.startListening({
  actionCreator: playerActions.start,
  async effect(_, { getState }) {
    bridge.stop({ propagate: false })
    await delay()
    bridge.start((getState() as RootState).player)
  },
})

playerListener.startListening({
  actionCreator: playerActions.stop,
  effect() {
    bridge.stop({ propagate: false })
  },
})

playerListener.startListening({
  actionCreator: playerActions.pause,
  effect() {
    bridge.playerControl({ action: 'pause' })
  },
})

playerListener.startListening({
  actionCreator: playerActions.play,
  effect() {
    bridge.playerControl({ action: 'play' })
  },
})

playerListener.startListening({
  actionCreator: playerActions.playRate,
  effect({ payload }) {
    bridge.setSpeed({ speed: payload })
  },
})

playerListener.startListening({
  actionCreator: playerActions.time,
  effect({ payload }) {
    if (payload.duration === undefined)
      bridge.seek({ position: payload.currentTime })
  },
})