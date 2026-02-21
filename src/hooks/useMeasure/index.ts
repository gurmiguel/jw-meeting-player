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
    
    const observer = new ResizeObserver(([entry]) => {
      if (entry.target !== elementRef.current) return

      const { width, height } = entry.contentRect

      setDimensions({ width, height })
    })

    observer.observe(elementRef.current, { box: 'content-box' })

    return () => {
      observer.disconnect()
    }
  }, [elementRef])

  return {
    width,
    height,
    mode,
  } as const
}
