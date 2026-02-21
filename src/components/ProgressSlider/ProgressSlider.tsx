import clsx from 'clsx'
import { KeyboardEvent, MouseEvent, SyntheticEvent, useCallback, useLayoutEffect, useRef, useState } from 'react'
import { delay } from '../../../shared/utils'
import { useMeasure } from '../../hooks/useMeasure'
import classes from './ProgressSlider.module.css'

interface Props {
  currentTime: number
  duration: number
  onChange(position: number): void
  disabled?: boolean
}

const WHITELIST_KEYS = ['Enter', 'Delete', 'Backspace', 'Tab', 'Home', 'End', ':', '.', ';', '-', ',']

export function ProgressSlider({ currentTime, duration, onChange, disabled = false }: Props) {
  const track = useRef<HTMLDivElement>(null)
  const thumb = useRef<HTMLDivElement>(null)
  const timeMarker = useRef<HTMLDivElement>(null)
  const durationRef = useRef<HTMLDivElement>(null)

  const { width: timestampWidth, height: timestampHeight } = useMeasure(durationRef)
  const [timestampMode, setTimestampMode] = useState<'display' | 'edit'>('display')
  const [lastTimestamp, setLastTimestamp] = useState<string>()
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

  function preventDefault(e: SyntheticEvent) {
    e.preventDefault()
  }

  function handleTimestampInput(e: KeyboardEvent<HTMLDivElement>) {
    if (!WHITELIST_KEYS.includes(e.key) && !(e.ctrlKey && e.key === 'a') && !e.key.startsWith('Arrow') && Number.isNaN(parseInt(e.key))) {
      preventDefault(e)
      return
    }

    const timestamp = e.currentTarget.innerText.trim()
    const seconds = secondsFromFormat(timestamp)

    const changeTimestamp = (seconds: number) => {
      seconds = Math.max(0, seconds)
      seconds = Math.min(seconds, duration - 1)
      e.currentTarget.innerText = formatSeconds(seconds).trim()

      if (!e.currentTarget.firstChild) return

      const length = e.currentTarget.innerText.length

      const range = document.createRange()
      range.setStart(e.currentTarget.firstChild, length - 2)
      range.setEnd(e.currentTarget.firstChild, length)
      window.getSelection()?.removeAllRanges()
      window.getSelection()?.addRange(range)
    }

    let stepCount = 1
    if (e.shiftKey) stepCount = 10
    if (e.ctrlKey) stepCount = 60
    if (e.altKey) stepCount = 120

    switch (e.key) {
      case 'ArrowDown':
        changeTimestamp(seconds - stepCount)
        return preventDefault(e)
      case 'ArrowUp':
        changeTimestamp(seconds + stepCount)
        return preventDefault(e)
    }

    if (e.key !== 'Enter') return

    preventDefault(e)
    
    if (!timestamp.length || !Number.isNaN(seconds))
      onChange(seconds)

    const element = e.currentTarget

    delay(50).then(() => element.blur())
  }

  const progressPercent = dragging === false && duration > 0
    ? currentTime / duration * 100
    : (dragging || 0)

  useLayoutEffect(() => {
    if (timestampMode === 'display') return

    setLastTimestamp(formatSeconds(percentageToSeconds(progressPercent)))
    return () => setLastTimestamp(undefined)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timestampMode])

  return (
    <div className={clsx(classes.container, disabled && classes.disabled)}>
      <div
        ref={timeMarker}
        className={classes.time}
        tabIndex={!disabled ? 0 : -1}
        style={timestampWidth < 0 ? undefined : { width: timestampWidth, height: timestampHeight }}
        onFocus={() => setTimestampMode('edit')}
        onBlur={() => setTimestampMode('display')}
        onKeyDown={handleTimestampInput}
        onPaste={preventDefault}
        onDrop={preventDefault}
        contentEditable={!disabled}
        suppressContentEditableWarning
      >
        {lastTimestamp ?? formatSeconds(percentageToSeconds(progressPercent))}
      </div>
      <div className={classes.track} onMouseDown={handleMouseDown}>
        <div ref={track} className={classes.thumbTrace} style={{ width: progressPercent + '%' }} />
        <div ref={thumb} className={classes.thumb} />
      </div>
      <div ref={durationRef} className={classes.time}>{formatSeconds(duration)}</div>
    </div>
  )
}

function formatSeconds(seconds: number) {
  const minutes = Math.floor(seconds / 60).toString()
  const remainingSeconds = Math.floor(seconds % 60).toString()

  return `${minutes.padStart(2, '0')}:${remainingSeconds.padStart(2, '0')}`
}

function secondsFromFormat(timestamp: string) {
  timestamp = timestamp.replace(/[,.\-+/;]+/g, ':')

  const [seconds, minutes = 0, hours = 0] = timestamp.split(':').reverse().map(x => parseInt(x))

  return (hours * 60*60) + (minutes * 60) + seconds
}
