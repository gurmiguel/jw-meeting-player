import { PauseIcon, PlayIcon, StopIcon } from '@heroicons/react/24/solid'
import classes from './MediaControls.module.css'
import { useEffect, useLayoutEffect, useState } from 'react'
import clsx from 'clsx'
import { DEFAULT_SPEED } from '../../../constants'
import { ProgressSlider } from '../ProgressSlider/ProgressSlider'

interface Props {
  playing: boolean
  playStatus: undefined | 'play' | 'pause'
  onPlay(): void
  onPause(): void
  onStop(): void
  onSetSpeed(speed: number): void
  currentTime: number
  duration: number
  onSeek(position: number): void
}

const SPEED_OPTIONS = [0.5, 0.7, 1.0, 1.1, 1.2, 1.5, 2]

export function MediaControls({ playing, playStatus, onPause, onPlay, onStop, onSetSpeed, currentTime, duration, onSeek }: Props) {
  const [currentSpeed, setCurrentSpeed] = useState(DEFAULT_SPEED)
  const [speedOptsOpen, setSpeedOptsOpen] = useState(false)

  useEffect(() => {
    setSpeedOptsOpen(false)

    if (playing) return

    setCurrentSpeed(DEFAULT_SPEED)
  }, [playing])

  useLayoutEffect(() => {
    onSetSpeed(currentSpeed)
  }, [currentSpeed, onSetSpeed])

  return (
    <div className={clsx(classes.container, classes.absoluteCenter)}>
      <div className={classes.progressBarContainer}>
        <ProgressSlider
          currentTime={currentTime}
          duration={duration}
          onChange={onSeek}
          disabled={!playing}
        />
      </div>

      {playStatus === 'play' && (
        <button className={classes.controlButton} onClick={onPause} disabled={!playing}>
          <PauseIcon className="w-6 h-6" />
        </button>
      )}
      {['pause', undefined].includes(playStatus) && (
        <button className={classes.controlButton} onClick={onPlay} disabled={!playing}>
          <PlayIcon className="w-6 h-6" />
        </button>
      )}
      <button className={classes.controlButton} onClick={onStop} disabled={!playing}>
        <StopIcon className="w-6 h-6" />
      </button>
      <button className={clsx(classes.controlButton, classes.speedsButton, speedOptsOpen && 'invisible pointer-events-none')} onClick={() => setSpeedOptsOpen(true)}>
        <span className="font-semibold">{currentSpeed.toFixed(1)}x</span>
      </button>
      {speedOptsOpen && (
        <div className={clsx(classes.container, 'absolute flex flex-col-reverse bottom-0 right-0')}>
          {SPEED_OPTIONS.map(speed => (
            <button
              key={speed}
              className={clsx(
                classes.controlButton,
                classes.speedsButton,
                classes.controlButtonRelative,
                speed === currentSpeed && classes.controlButtonActive,
              )}
              onClick={() => {
                setCurrentSpeed(speed)
                setSpeedOptsOpen(false)
              }}
            >
              {speed === currentSpeed && <span className="absolute right-full -mr-4 font-black">🠢</span>}
              <span className="font-semibold">{speed.toFixed(1)}x</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
