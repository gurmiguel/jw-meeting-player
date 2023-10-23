import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { titleBar } from '../../../constants'
import { delay } from '../../lib/utils'

export function useDraggable<E extends HTMLElement>(gutter = 0) {
  const ref = useRef<E>(null)
  
  const initialPosition = useRef({ top: Infinity, left: Infinity, width: Infinity, height: Infinity })
  
  const [dragging, setDragging] = useState(false)

  const setNewPosition = useCallback((newX: number, newY: number) => {
    if (!ref.current) return
    
    const { width, height } = ref.current.getBoundingClientRect()
    
    const minTop = titleBar.height + gutter
    const minLeft = gutter
    const maxTop = window.innerHeight - height - gutter
    const maxLeft = window.innerWidth - width - gutter
    
    const newTop = Math.min(maxTop, Math.max(minTop, newY))
    const newLeft = Math.min(maxLeft, Math.max(minLeft, newX))
    
    ref.current.style.left = `${newLeft}px`
    ref.current.style.top = `${newTop}px`
  }, [gutter])
  
  const resetPosition = useCallback(async () => {
    if (!ref.current) return
    
    const { top, left, width, height } = initialPosition.current
    
    if ([top, left, width, height].includes(Infinity)) return
    
    ref.current.style.width = `${width}px`
    ref.current.style.height = `${height}px`

    await delay()

    setNewPosition(left, top)
  }, [setNewPosition])
  
  function onMouseDown(e: React.MouseEvent<HTMLElement>) {
    if (!ref.current) return

    if (getComputedStyle(e.currentTarget).resize !== 'none') {
      const rect = e.currentTarget.getBoundingClientRect()
      console.log(e.clientX, rect.right)
      console.log(e.clientY, rect.bottom)

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

  const calculateInitialPosition = useCallback((width?: number, height?: number) => {    
    if (!ref.current) return

    const { top, left } = getComputedStyle(ref.current)
    const rect = ref.current.getBoundingClientRect()
    width ??= rect.width
    height ??= rect.height
    initialPosition.current = {
      top: parseInt(top),
      left: parseInt(left),
      width,
      height,
    }

  }, [])
  
  useLayoutEffect(() => {
    calculateInitialPosition()
  }, [calculateInitialPosition])
  
  useEffect(() => {
    async function onWindowResize() {
      if (!ref.current) return

      await delay()
      
      const { x, y } = ref.current.getBoundingClientRect()
      
      setNewPosition(x, y)

      calculateInitialPosition(initialPosition.current.width, initialPosition.current.height)
    }
    
    window.addEventListener('resize', onWindowResize)
    return () => window.removeEventListener('resize', onWindowResize)
  }, [calculateInitialPosition, setNewPosition])
  
  return [ ref, {
    onMouseDown,
    onDoubleClick,
  }, dragging] as const
}
