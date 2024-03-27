import clsx from 'clsx'
import { MouseEvent, useCallback, useRef, useState } from 'react'
import classes from './ProgressSlider.module.css'

interface Props {
  currentTime: number
  duration: number
  onChange(position: number): void
  disabled?: boolean
}

export function ProgressSlider({ currentTime, duration, onChange, disabled = false }: Props) {
  const track = useRef<HTMLDivElement>(null)
  const thumb = useRef<HTMLDivElement>(null)
  const timeMarker = useRef<HTMLDivElement>(null)

  const [dragging, setDragging] = useState<number | false>(false)

  const percentageToSeconds = useCallback((percentage: number) => {
    const progressInSeconds = duration * percentage / 100

    return progressInSeconds
  }, [duration])

  function handleMouseDown(e: MouseEvent<HTMLDivElement>) {
    e.preventDefault()

    if (disabled) return

    const trackRect = e.currentTarget.getBoundingClientRect()
    
    let percentageX: number | null = null
    
    const currentProgress = handleProgressMove(e.clientX)
    setDragging(currentProgress)

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onRelease)

    function handleProgressMove(x: number) {
      const thumbThreshold = (thumb.current?.offsetWidth ?? 0) / 2
      const relativeX = x - trackRect.x + thumbThreshold
      percentageX = Math.max(0, Math.min(relativeX * 100 / trackRect.width, 100))

      if (track.current)
        track.current.style.width = `${percentageX}%`
      if (timeMarker.current)
        timeMarker.current.innerText = formatSeconds(percentageToSeconds(percentageX))

      return percentageX
    }

    function onMove(e: globalThis.MouseEvent) {
      handleProgressMove(e.clientX)
    }

    function onRelease() {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onRelease)

      if (percentageX !== null) {
        const newPosition = percentageX / 100 * duration
        onChange(newPosition)
      }
      setDragging(false)
    }
  }

  const progressPercent = dragging === false && duration > 0
    ? currentTime / duration * 100
    : (dragging || 0)

  return (
    <div className={clsx(classes.container, disabled && classes.disabled)}>
      <div ref={timeMarker} className={classes.time}>{formatSeconds(percentageToSeconds(progressPercent))}</div>
      <div className={classes.track} onMouseDown={handleMouseDown}>
        <div ref={track} className={classes.thumbTrace} style={{ width: progressPercent + '%' }} />
        <div ref={thumb} className={classes.thumb} />
      </div>
      <div className={classes.time}>{formatSeconds(duration)}</div>
    </div>
  )
}

function formatSeconds(seconds: number) {
  const minutes = Math.floor(seconds / 60).toString()
  const remainingSeconds = Math.floor(seconds % 60).toString()

  return `${minutes.padStart(2, '0')}:${remainingSeconds.padStart(2, '0')}`
}
