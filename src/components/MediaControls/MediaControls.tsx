import { PauseIcon, PlayIcon, StopIcon, XMarkIcon } from '@heroicons/react/24/solid'
import clsx from 'clsx'
import { useCallback, useState } from 'react'
import { SPEED_OPTIONS } from '../../../shared/constants'
import { PlayerState } from '../../../shared/state'
import { useClickOutside } from '../../hooks/useClickOutside'
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
  disableSeek?: boolean
  isLooping: boolean
  onToggleLoop(): void
}

export function MediaControls({ playing, type, playStatus, onPause, onPlay, onStop, speed: currentSpeed, onSetSpeed, currentTime, duration, onSeek, disableSeek = false, isLooping, onToggleLoop }: Props) {
  const playingMedia = playing && type !== 'image'
  const [speedOptsOpen, setSpeedOptsOpen] = useState(false)

  const clickOutsideRef = useClickOutside<HTMLDivElement>(useCallback(() => {
    setSpeedOptsOpen(false)
  }, []), !speedOptsOpen)

  return (
    <div className={clsx(classes.container, classes.absoluteCenter)}>
      <div className={classes.progressBarContainer}>
        <ProgressSlider
          currentTime={currentTime}
          duration={duration}
          onChange={onSeek}
          disabled={!playingMedia || disableSeek}
        />
      </div>

      <div className={classes.controlsContainer}>
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
        <button className={clsx(classes.controlButton, classes.speedsButton, speedOptsOpen && 'invisible pointer-events-none')} onClick={() => setSpeedOptsOpen(true)} disabled={(['image'] as Array<typeof type>).includes(type)}>
          <span className="font-semibold">{currentSpeed.toFixed(1)}x</span>
        </button>
        <label className={clsx(classes.controlButton, 'flex items-center px-2 py-0 has-[input:enabled]:cursor-pointer')}>
          <input type="checkbox" checked={isLooping} onChange={onToggleLoop} disabled={!type || !['video', 'audio'].includes(type)} className="cursor-pointer" style={{ appearance: 'checkbox' }} />
          <span className="font-semibold text-sm -mb-1">Loop</span>
        </label>
        {speedOptsOpen && (
          <div ref={clickOutsideRef} className={clsx(classes.container, 'absolute flex flex-col-reverse bottom-0 right-0 justify-between gap-2 p-2 rounded-md bg-zinc-950')}>
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
    </div>
  )
}
