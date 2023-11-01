import {
  shallowEqual,
  TypedUseSelectorHook,
  useDispatch,
  useSelector,
  useStore,
} from 'react-redux'

import { Slice } from '@reduxjs/toolkit'
import { AppDispatch, RootState } from './index'

export const useAppDispatch = useDispatch<AppDispatch>

/**
 * @param equalityFn use shallowEqual by default to allow optimization when returning multiple values from state as an object
 */
export const useAppSelector: TypedUseSelectorHook<RootState> = (
  selector,
  equalityFn = shallowEqual,
  // @ts-expect-error
) => useSelector(selector, equalityFn)

export const useAppStore = useStore<RootState>

export type SliceActions<TSlice extends Slice, Actions = TSlice['actions']> = {
  [K in keyof Actions]: Actions[K]
}[keyof Actions]
