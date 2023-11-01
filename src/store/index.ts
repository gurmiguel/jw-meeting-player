import { configureStore } from '@reduxjs/toolkit'
import { electronApi } from './api'
import { playerListener } from './player/listener'
import player from './player/slice'

export const store = configureStore({
  reducer: {
    player,
    [electronApi.reducerPath]: electronApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware()
      .prepend(playerListener.middleware)
      .prepend(electronApi.middleware),
})

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
