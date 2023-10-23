import {
  shallowEqual,
  TypedUseSelectorHook,
  useDispatch,
  useSelector,
  useStore,
} from 'react-redux'

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
