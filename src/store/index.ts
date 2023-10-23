import { configureStore } from '@reduxjs/toolkit'
import { playerListener } from './player/listener'
import player from './player/slice'

export const store = configureStore({
  reducer: {
    player,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().prepend(playerListener.middleware),
})

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
