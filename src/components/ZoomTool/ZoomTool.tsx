import clsx from 'clsx'
import { throttle } from 'lodash'
import { WheelEvent, useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useDraggable } from '../../hooks/useDraggable'
import { useMeasure } from '../../hooks/useMeasure'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { playerActions } from '../../store/player/slice'

interface Props {
  gutter?: number
  step?: number
}

const MIN_ZOOM = 1.0
const MAX_ZOOM = 5

export function ZoomTool({ gutter = 0, step = 0.05 }: Props) {
  const dispatch = useAppDispatch()

  const container = useRef<HTMLDivElement>(null)
  const dragContainer = useRef<HTMLDivElement>(null)
  const [zoomLevel, setZoomLevel] = useState(useAppSelector(state => state.player.zoomLevel))

  const containerSize = useMeasure(container)
  const dragContainerSize = useMeasure(dragContainer)

  const sendZoomLevel = useCallback((top: number, left: number, zoom = zoomLevel) => {
    const topPercent = (top * 100) / dragContainerSize.height
    const leftPercent = (left * 100) / dragContainerSize.width

    const position = {
      top: topPercent,
      left: leftPercent,
    }

    dispatch(playerActions.zoomLevel({ zoomLevel: zoom, position }))
  }, [dispatch, dragContainerSize.height, dragContainerSize.width, zoomLevel])
  
  const [{ ref: zoomBox, ...dragHandlers }, dragging] = useDraggable<HTMLDivElement>({
    container: dragContainer,
    disabled: containerSize.width === -Infinity,
    sizing: false,
    onDrag: useMemo(() => throttle(sendZoomLevel, 50), [sendZoomLevel]),
  })

  const mousePos = useRef({ x: -Infinity, y: -Infinity })

  const handleMouseWheel = useMemo(() => throttle((e: WheelEvent) => {
    if (!zoomBox.current || !dragContainer.current) return

    e.nativeEvent.stopImmediatePropagation()
    
    const wheelMovement = e.deltaY > 0 ? 'down' : 'up'

    const { top, left } = dragContainer.current.getBoundingClientRect()

    mousePos.current = {
      x: e.clientX - left,
      y: e.clientY - top,
    }
    let currentStep = step

    if (e.ctrlKey)
      currentStep *= 0.5
    if (e.shiftKey)
      currentStep *= 2

    setZoomLevel(zoom => {
      const value = Math.max(MIN_ZOOM, Math.min(wheelMovement === 'up' ? zoom * (1 + currentStep) : zoom * (1 - currentStep), MAX_ZOOM))

      return parseFloat(value.toFixed(2))
    })
  }, 10), [step, zoomBox])

  useLayoutEffect(() => {
    if (!dragContainer.current || !zoomBox.current) return

    const boundaries = getBoundaries(dragContainer.current)
    const rect = zoomBox.current.getBoundingClientRect()
    const targetCenter = mousePos.current

    const positionCentered = {
      top: Math.floor(targetCenter.y - (rect.height / 2)),
      bottom: -Infinity,
      left: Math.floor(targetCenter.x - (rect.width / 2)),
      right: -Infinity,
    }
    positionCentered.bottom = positionCentered.top + rect.height
    positionCentered.right = positionCentered.left + rect.width

    let top = positionCentered.top
    let left = positionCentered.left
    if (positionCentered.top < boundaries.top) {
      top = boundaries.top
    }
    if (positionCentered.left < boundaries.left) {
      left = boundaries.left
    }
    if (positionCentered.bottom > boundaries.bottom) {
      top = boundaries.bottom - rect.height
    }
    if (positionCentered.right > boundaries.right) {
      left = boundaries.right - rect.width
    }

    zoomBox.current.style.top = `${Math.round(top)}px`
    zoomBox.current.style.left = `${Math.round(left)}px`

    sendZoomLevel(top, left, zoomLevel)
  }, [sendZoomLevel, zoomBox, zoomLevel])

  return (
    <div
      ref={container}
      className="absolute"
      style={{ top: gutter, left: gutter, bottom: gutter, right: gutter }}
      onWheelCapture={handleMouseWheel}
    >
      <div
        ref={dragContainer}
        className={clsx([
          'absolute absolute-center aspect-video',
          containerSize.mode === 'portrait' && 'w-full',
          containerSize.mode === 'landscape' && 'h-full',
        ])}
        onDoubleClick={() => setZoomLevel(1)}
      >
        <div
          ref={zoomBox}
          {...dragHandlers}
          className={clsx([
            'zoom-indicator absolute border-inset-white cursor-grab aspect-video',
            dragging && 'cursor-grabbing',
          ])}
          style={{
            width: `${100 / zoomLevel}%`,
          }}
        />
      </div>
    </div>
  )
}

function getBoundaries(container: HTMLElement) {
  return {
    top: 0,
    left: 0,
    bottom: container.offsetHeight,
    right: container.offsetWidth,
  }
}
