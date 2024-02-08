import { throttle, ThrottleSettings } from 'lodash-es'
import { useMemo } from 'react'

export function useThrottleCallback<T extends (...args: any[]) => any>(
  callback: T,
  wait: number,
  settings?: ThrottleSettings,
) {
  const throttledCallback = useMemo(
    () => throttle(callback, wait, settings),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [callback, wait],
  )

  return throttledCallback
}
