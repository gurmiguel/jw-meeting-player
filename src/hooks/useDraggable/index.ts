import React, { useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import { titleBar } from '../../../constants'
import { delay } from '../../lib/utils'

export function useDraggable<E extends HTMLElement>(gutter = 0) {
  const ref = useRef<E>(null)
  
  const initialPosition = useRef({ top: Infinity, left: Infinity })
  
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
  
  const resetPosition = useCallback(() => {
    if (!ref.current) return
    
    const { top, left } = initialPosition.current
    
    if (top === Infinity || left === Infinity) return
    
    setNewPosition(left, top)
  }, [setNewPosition])
  
  function onMouseDown(e: React.MouseEvent) {
    e.preventDefault()
    
    if (!ref.current) return
    
    document.addEventListener('mousemove', onMouseMove, false)
    document.addEventListener('mouseup', onMouseUp, false)
    
    const { top, left } = ref.current.getBoundingClientRect()
    const initialMousePos = { x: e.clientX - left, y: e.clientY - top }
    
    function onMouseUp() {
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
  
  useLayoutEffect(() => {
    if (!ref.current) return
    
    const { top, left } = ref.current.style
    initialPosition.current = {
      top: parseInt(top),
      left: parseInt(left),
    }
  }, [])
  
  useEffect(() => {
    async function onWindowResize() {
      if (!ref.current) return

      await delay()
      
      const { x, y } = ref.current.getBoundingClientRect()
      
      setNewPosition(x, y)
    }
    
    window.addEventListener('resize', onWindowResize)
    return () => window.removeEventListener('resize', onWindowResize)
  }, [setNewPosition])
  
  return [ ref, {
    onMouseDown,
    onDoubleClick,
  }] as const
}
