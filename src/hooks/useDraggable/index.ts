import React, { RefObject, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { delay } from '../../../shared/utils'
import { getContainerBoundaries } from '../../lib/utils'

interface DragOptions {
  container?: RefObject<HTMLElement>
  gutter?: number
  disabled?: boolean
  onDrag?: (top: number, left: number) => void
}

export function useDraggable<E extends HTMLElement>({ container, gutter = 0, disabled = false, onDrag }: DragOptions) {
  const ref = useRef<E>(null)
  
  const [dragged, setDragged] = useState(false)
  const [dragging, setDragging] = useState(false)

  const getLeftPos = useCallback((x: number) => {
    const { width = 0 } = ref.current?.getBoundingClientRect() ?? {}
    const boundaries = getContainerBoundaries(container?.current ?? undefined, gutter)

    const minLeft = boundaries.left
    const maxLeft = boundaries.right - width

    return Math.floor(Math.min(maxLeft, Math.max(minLeft, x)))    
  }, [container, gutter])
  
  const getTopPos = useCallback((y: number) => {
    const { height = 0 } = ref.current?.getBoundingClientRect() ?? {}
    const boundaries = getContainerBoundaries(container?.current ?? undefined, gutter)

    const minTop = boundaries.top
    const maxTop = boundaries.bottom - height

    return Math.floor(Math.min(maxTop, Math.max(minTop, y)))
  }, [container, gutter])

  const getIsDefault = useCallback(() => {
    return ref.current?.style.left === getLeftPos(window.innerWidth) + 'px' && ref.current?.style.top === getTopPos(window.innerHeight) + 'px'
  }, [getLeftPos, getTopPos])

  const setNewPosition = useCallback((newX: number, newY: number) => {
    // just for typings validation, not actually a thing
    if (!ref.current) return { top: newY, left: newX }
    
    setDragged(true)
    
    const newLeft = getLeftPos(newX)
    const newTop = getTopPos(newY)

    ref.current.style.left = `${newLeft}px`
    ref.current.style.top = `${newTop}px`

    return {
      top: newTop,
      left: newLeft,
    }
  }, [getLeftPos, getTopPos])
  
  const resetPosition = useCallback(async () => {
    if (!ref.current) return
    
    if (getIsDefault()) return

    await delay()

    setNewPosition(window.innerWidth, window.innerHeight)
    setDragged(false)
  }, [getIsDefault, setNewPosition])
  
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
    }
    
    window.addEventListener('resize', onWindowResize)
    return () => window.removeEventListener('resize', onWindowResize)
  }, [disabled, dragged, resetPosition, setNewPosition])

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
    isDefaultPosition: getIsDefault(),
  }, dragging, dragged] as const
}
