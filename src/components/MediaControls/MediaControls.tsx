import { PauseIcon, PlayIcon, StopIcon, XMarkIcon } from '@heroicons/react/24/solid'
import clsx from 'clsx'
import { useState } from 'react'
import { PlayerState } from '../../store/player/slice'
import { ProgressSlider } from '../ProgressSlider/ProgressSlider'
import classes from './MediaControls.module.css'

interface Props {
  playing: boolean
  type: PlayerState['type']
  playStatus: undefined | 'play' | 'pause'
  onPlay(): void
  onPause(): void
  onStop(): void
  speed: number
  onSetSpeed(speed: number): void
  currentTime: number
  duration: number
  onSeek(position: number): void
}

const SPEED_OPTIONS = [0.5, 0.7, 1.0, 1.1, 1.2, 1.5, 2]

export function MediaControls({ playing, type, playStatus, onPause, onPlay, onStop, speed: currentSpeed, onSetSpeed, currentTime, duration, onSeek }: Props) {
  const playingMedia = playing && type !== 'image'
  const [speedOptsOpen, setSpeedOptsOpen] = useState(false)

  return (
    <div className={clsx(classes.container, classes.absoluteCenter)}>
      <div className={classes.progressBarContainer}>
        <ProgressSlider
          currentTime={currentTime}
          duration={duration}
          onChange={onSeek}
          disabled={!playingMedia}
        />
      </div>

      {playStatus === 'play' && (
        <button className={classes.controlButton} onClick={onPause} disabled={!playingMedia}>
          <PauseIcon className="w-6 h-6" />
        </button>
      )}
      {['pause', undefined].includes(playStatus) && (
        <button className={classes.controlButton} onClick={onPlay} disabled={!playingMedia}>
          <PlayIcon className="w-6 h-6" />
        </button>
      )}
      <button className={classes.controlButton} onClick={onStop} disabled={!playing}>
        {type === 'image'
          ? <XMarkIcon className="w-6 h-6" />
          : <StopIcon className="w-6 h-6" />}
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
                onSetSpeed(speed)
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
