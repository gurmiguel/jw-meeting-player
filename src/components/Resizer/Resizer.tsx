import clsx from 'clsx'
import { Children, PropsWithChildren, ReactElement, cloneElement, useCallback, useLayoutEffect, useRef } from 'react'
import { delay } from '../../../shared/utils'
import { useMultipleRef } from '../../hooks/useMultipleRef'
import { getContainerBoundaries } from '../../lib/utils'
import styles from './Resizer.module.css'

interface ResizerProps {
  gutter?: number
  disabled?: boolean
  children: ReactElement<PropsWithChildren<{ onDoubleClick?: React.MouseEventHandler, ref?: React.Ref<HTMLElement> }>>
}

enum Positions {
  tl,
  tr,
  bl,
  br,
}

export function Resizer({ children, gutter = 0, disabled = false }: ResizerProps) {
  const child = Children.only<typeof children & { ref?: React.Ref<HTMLElement> }>(children)

  const ref = useRef<HTMLElement>(null)
  const initialSize = useRef({ width: Infinity, height: Infinity })

  const refs = useMultipleRef(ref, child.ref ?? null)

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

  const createHandlers = (pos: Positions) => {
    function onMouseDown(e: React.MouseEvent) {
      const target = e.currentTarget.parentElement as HTMLElement

      e.preventDefault()
      e.stopPropagation()

      const initialPos = { x: e.clientX, y: e.clientY }
      const initialRect = target.getBoundingClientRect()

      const boundaries = getContainerBoundaries(window, gutter)

      const minTop = boundaries.top
      const minLeft = boundaries.left
      const maxWidth = boundaries.right - initialRect.left
      const maxHeight = boundaries.bottom - initialRect.top

      document.addEventListener('mousemove', onMove)
      document.addEventListener('mouseup', onRelease)

      function onMove(e: MouseEvent) {
        const relativePos = { x: e.clientX - initialPos.x, y: e.clientY - initialPos.y }

        let newTop, newLeft
        
        switch (pos) {
          case Positions.tl:
            newTop = initialRect.y + relativePos.y
            newLeft = initialRect.x + relativePos.x
            if (newTop > minTop) {
              target.style.setProperty('top', `${newTop}px`)
              target.style.setProperty('height', `${initialRect.height - relativePos.y}px`)
            }
            if (newLeft > minLeft) {
              target.style.setProperty('left', `${initialRect.x + relativePos.x}px`)
              target.style.setProperty('width', `${initialRect.width - relativePos.x}px`)
            }
            break
          case Positions.tr:
            newTop = initialRect.y + relativePos.y
            if (newTop > minTop) {
              target.style.setProperty('top', `${initialRect.y + relativePos.y}px`)
              target.style.setProperty('height', `${initialRect.height - relativePos.y}px`)
            }
            target.style.setProperty('width', `${Math.min(maxWidth, initialRect.width + relativePos.x)}px`)
            break
          case Positions.bl:
            newLeft = initialRect.x + relativePos.x
            if (newLeft > minLeft) {
              target.style.setProperty('left', `${initialRect.x + relativePos.x}px`)
              target.style.setProperty('width', `${initialRect.width - relativePos.x}px`)
            }
            target.style.setProperty('height', `${Math.min(maxHeight, initialRect.height + relativePos.y)}px`)
            break
          case Positions.br:
            target.style.setProperty('width', `${Math.min(maxWidth, initialRect.width + relativePos.x)}px`)
            target.style.setProperty('height', `${Math.min(maxHeight, initialRect.height + relativePos.y)}px`)
            break
        }
      }

      function onRelease() {
        document.removeEventListener('mousemove', onMove)
        document.removeEventListener('mouseup', onRelease)
      }
    }

    return { onMouseDown }
  }

  function onDoubleClick(e: React.MouseEvent) {
    if (ref.current && !disabled) {
      e.preventDefault()

      const { width, height } = initialSize.current

      ref.current.style.width = `${width}px`
      ref.current.style.height = `${height}px`
    }

    child.props.onDoubleClick?.(e)
  }
  
  useLayoutEffect(() => {
    if (disabled) return
    
    calculateInitialSize()
    
    async function onWindowResize() {
      await delay()

      calculateInitialSize(initialSize.current.width, initialSize.current.height)
    }
    
    window.addEventListener('resize', onWindowResize)
    return () => window.removeEventListener('resize', onWindowResize)
  }, [calculateInitialSize, disabled])

  return cloneElement(child, {
    ref: refs,
    onDoubleClick,
  }, (
    <>
      {child.props.children}

      {!disabled && (
        <>
          <div {...createHandlers(Positions.tl)} className={clsx(styles.resizeHandler, styles.topLeft, 'icon-shadow')} />
          <div {...createHandlers(Positions.tr)} className={clsx(styles.resizeHandler, styles.topRight, 'icon-shadow')} />
          <div {...createHandlers(Positions.bl)} className={clsx(styles.resizeHandler, styles.bottomLeft, 'icon-shadow')} />
          <div {...createHandlers(Positions.br)} className={clsx(styles.resizeHandler, styles.bottomRight, 'icon-shadow')} />
        </>
      )}
    </>
  ))
}
