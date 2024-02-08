import { useEffect, useRef, useState } from 'react'

export function useDebounceValue<T, B extends boolean = false>(
  value: T,
  /** Use a supplier when you need to add conditional timeout depending on the values ("useCallback" required) */
  timeInMilliseconds: number | ((current: T, previous: T | null) => number),
  debounceInitialization?: B,
): B extends true ? T | null : T {
  const [debouncedValue, setDebouncedValue] = useState(
    debounceInitialization ? null : value,
  )
  const previousValue = useRef(debouncedValue)

  useEffect(() => {
    const timeoutValue =
      typeof timeInMilliseconds === 'number'
        ? timeInMilliseconds
        : timeInMilliseconds(value, previousValue.current)
    const timeout = setTimeout(() => {
      previousValue.current = value
      setDebouncedValue(value)
    }, timeoutValue)

    return () => {
      clearTimeout(timeout)
    }
  }, [value, timeInMilliseconds])

  return debouncedValue as B extends true ? T | null : T
}
