import { debounce, DebounceSettings } from 'lodash-es'
import { useMemo } from 'react'

export function useDebounceCallback<T extends (...args: any[]) => any>(
  callback: T,
  wait: number,
  settings?: DebounceSettings,
) {
  const debouncedCallback = useMemo(
    () => debounce(callback, wait, settings),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [callback, wait],
  )

  return debouncedCallback
}
