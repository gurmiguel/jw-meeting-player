import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { titleBar } from '../../../shared/constants'
import { delay } from '../../../shared/utils'

export function useDraggable<E extends HTMLElement>(gutter = 0) {
  const ref = useRef<E>(null)
  
  const initialPosition = useRef({ width: Infinity, height: Infinity })
  
  const [dragging, setDragging] = useState(false)

  const setNewPosition = useCallback((newX: number, newY: number) => {
    if (!ref.current) return
    
    const { width, height } = ref.current.getBoundingClientRect()
    
    const boundaries = getWindowBoundaries(gutter)

    const minTop = titleBar.height + gutter
    const minLeft = gutter
    const maxTop = boundaries.bottom - height
    const maxLeft = boundaries.right - width
    
    const newTop = Math.min(maxTop, Math.max(minTop, newY))
    const newLeft = Math.min(maxLeft, Math.max(minLeft, newX))
    
    ref.current.style.left = `${newLeft}px`
    ref.current.style.top = `${newTop}px`
  }, [gutter])
  
  const resetPosition = useCallback(async () => {
    if (!ref.current) return
    
    const { width, height } = initialPosition.current
    
    if ([width, height].includes(Infinity)) return
    
    ref.current.style.width = `${width}px`
    ref.current.style.height = `${height}px`

    await delay()

    setNewPosition(window.innerWidth, window.innerHeight)
  }, [setNewPosition])
  
  function onMouseDown(e: React.MouseEvent<HTMLElement>) {
    if (!ref.current) return

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
    
    const { top, left } = ref.current.getBoundingClientRect()
    const initialMousePos = { x: e.clientX - left, y: e.clientY - top }
    
    function onMouseUp() {
      setDragging(false)
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }
    
    function onMouseMove(e: MouseEvent) {
      const { clientX, clientY } = e
      
      if (!ref.current) return
      
      const newX = clientX - initialMousePos.x
      const newY = clientY - initialMousePos.y
      
      setNewPosition(newX, newY)
    }
  }
  
  function onDoubleClick(e: React.MouseEvent) {
    e.preventDefault()
    
    resetPosition()
  }

  const calculateInitialSize = useCallback((width?: number, height?: number) => {    
    if (!ref.current) return

    const rect = ref.current.getBoundingClientRect()
    width ??= rect.width
    height ??= rect.height
    initialPosition.current = {
      width,
      height,
    }

  }, [])
  
  useLayoutEffect(() => {
    calculateInitialSize()
  }, [calculateInitialSize])
  
  useEffect(() => {
    async function onWindowResize() {
      if (!ref.current) return

      await delay()
      
      const { x, y } = ref.current.getBoundingClientRect()
      
      setNewPosition(x, y)

      calculateInitialSize(initialPosition.current.width, initialPosition.current.height)
    }
    
    window.addEventListener('resize', onWindowResize)
    return () => window.removeEventListener('resize', onWindowResize)
  }, [calculateInitialSize, setNewPosition])
  
  return [ ref, {
    onMouseDown,
    onDoubleClick,
  }, dragging] as const
}

function getWindowBoundaries(gutter = 0) {
  return {
    bottom: window.innerHeight - gutter,
    right: window.innerWidth - gutter - (window.scrollbars.visible ? 20 : 0),
  }
}
