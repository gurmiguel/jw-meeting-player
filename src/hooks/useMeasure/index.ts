import { RefObject, useLayoutEffect, useState } from 'react'

export function useMeasure(elementRef: RefObject<HTMLElement> | null) {
  const [{ width, height }, setDimensions] = useState({ width: -Infinity, height: -Infinity })

  const mode = width > height
    ? 'landscape'
    : 'portrait'

  useLayoutEffect(() => {
    if (!elementRef?.current) return

    const { width, height } = elementRef.current.getBoundingClientRect()

    setDimensions({ width, height })
  }, [elementRef])

  return {
    width,
    height,
    mode,
  } as const
}
