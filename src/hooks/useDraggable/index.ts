import React, { RefObject, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { titleBar } from '../../../shared/constants'
import { delay } from '../../../shared/utils'

interface DragOptions {
  container?: RefObject<HTMLElement>
  gutter?: number
  sizing?: boolean
  disabled?: boolean
  onDrag?: (top: number, left: number) => void
}

export function useDraggable<E extends HTMLElement>({ container, gutter = 0, sizing = true, disabled = false, onDrag }: DragOptions) {
  const ref = useRef<E>(null)
  
  const initialSize = useRef({ width: Infinity, height: Infinity })
  
  const [dragged, setDragged] = useState(false)
  const [dragging, setDragging] = useState(false)

  const setNewPosition = useCallback((newX: number, newY: number) => {
    // just for typings validation, not actually a thing
    if (!ref.current) return { top: newY, left: newX }
    
    const { width, height } = ref.current.getBoundingClientRect()
    
    const boundaries = getContainerBoundaries(container?.current ?? undefined, gutter)

    const minTop = boundaries.top
    const minLeft = boundaries.left
    const maxTop = boundaries.bottom - height
    const maxLeft = boundaries.right - width
    
    const newTop = Math.floor(Math.min(maxTop, Math.max(minTop, newY)))
    const newLeft = Math.floor(Math.min(maxLeft, Math.max(minLeft, newX)))

    setDragged(true)
    
    ref.current.style.left = `${newLeft}px`
    ref.current.style.top = `${newTop}px`

    return {
      top: newTop,
      left: newLeft,
    }
  }, [container, gutter])
  
  const resetPosition = useCallback(async () => {
    if (!ref.current) return
    
    const { width, height } = initialSize.current
    
    if ([width, height].includes(Infinity)) return
    
    if (sizing) {
      ref.current.style.width = `${width}px`
      ref.current.style.height = `${height}px`
    }

    await delay()

    setNewPosition(window.innerWidth, window.innerHeight)
    setDragged(false)
  }, [sizing, setNewPosition])
  
  function onMouseDown(e: React.MouseEvent<HTMLElement>) {
    if (!ref.current || disabled) return

    if (getComputedStyle(e.currentTarget).resize !== 'none') {
      const rect = e.currentTarget.getBoundingClientRect()

      const HORIZONTAL_RESIZER_THRESHOLD = 20
      const VERTICAL_RESIZER_THRESHOLD = 18

      // ignore event to allow resizing instead
      if (Math.abs(e.clientX - rect.right) < HORIZONTAL_RESIZER_THRESHOLD
        && Math.abs(e.clientY - rect.bottom) < VERTICAL_RESIZER_THRESHOLD)
        return
    }
    
    e.preventDefault()
    
    setDragging(true)
    document.addEventListener('mousemove', onMouseMove, false)
    document.addEventListener('mouseup', onMouseUp, false)

    const top = ref.current.offsetTop
    const left = ref.current.offsetLeft

    const initialMousePos = { x: e.clientX - left, y: e.clientY - top }
    
    function onMouseMove(e: MouseEvent) {
      const { clientX, clientY } = e
      
      if (!ref.current) return
      
      const newX = clientX - initialMousePos.x
      const newY = clientY - initialMousePos.y
      
      const { top, left } = setNewPosition(newX, newY)

      onDrag?.(top, left)
    }
    
    function onMouseUp() {
      setDragging(false)
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }
  }
  
  function onDoubleClick(e: React.MouseEvent) {
    if (disabled) return

    e.preventDefault()
    
    resetPosition()
  }

  const calculateInitialSize = useCallback((width?: number, height?: number) => {    
    if (!ref.current) return

    const rect = ref.current.getBoundingClientRect()
    width ??= rect.width
    height ??= rect.height
    initialSize.current = {
      width,
      height,
    }
  }, [])
  
  useLayoutEffect(() => {
    if (!disabled)
      calculateInitialSize()
  }, [calculateInitialSize, disabled])
  
  useEffect(() => {
    if (disabled) return

    async function onWindowResize() {
      if (!ref.current) return

      await delay()

      if (dragged) {
        const { x, y } = ref.current.getBoundingClientRect()

        setNewPosition(x, y)
      } else {
        await resetPosition()
      }

      calculateInitialSize(initialSize.current.width, initialSize.current.height)
    }
    
    window.addEventListener('resize', onWindowResize)
    return () => window.removeEventListener('resize', onWindowResize)
  }, [calculateInitialSize, disabled, dragged, resetPosition, setNewPosition])

  useLayoutEffect(() => {
    if (!ref.current) return

    if (disabled) {
      setDragged(false)
      ref.current.style.removeProperty('top')
      ref.current.style.removeProperty('left')
    }
  }, [disabled])
  
  return [ {
    ref,
    onMouseDown,
    onDoubleClick,
  }, dragging, dragged] as const
}

function getContainerBoundaries(container: HTMLElement | Window = window, gutter = 0) {
  if (container instanceof Window)
    return {
      top: titleBar.height + gutter,
      left: gutter,
      bottom: window.innerHeight - gutter,
      right: window.innerWidth - gutter - (window.scrollbars.visible ? 20 : 0),
    }
  else
    return {
      top: gutter,
      left: gutter,
      bottom: container.offsetHeight,
      right: container.offsetWidth,
    }
}
