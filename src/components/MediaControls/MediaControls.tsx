import { BackwardIcon, ForwardIcon, PauseIcon, PlayIcon, StopIcon } from '@heroicons/react/24/solid'
import classes from './MediaControls.module.css'

interface Props {
  playing: boolean
  playStatus: undefined | 'play' | 'pause'
  onPlay(): void
  onPause(): void
  onStop(): void
}

export function MediaControls({ playing, playStatus, onPause, onPlay, onStop }: Props) {
  if (!playing) return <></>

  return (
    <div className={classes.container}>
      <button className={classes.controlButton}>
        <BackwardIcon className="w-6 h-6" />
      </button>
      {playStatus === 'play' && (
        <button className={classes.controlButton} onClick={onPause}>
          <PauseIcon className="w-6 h-6" />
        </button>
      )}
      {['pause', undefined].includes(playStatus) && (
        <button className={classes.controlButton} onClick={onPlay}>
          <PlayIcon className="w-6 h-6" />
        </button>
      )}
      <button className={classes.controlButton} onClick={onStop}>
        <StopIcon className="w-6 h-6" />
      </button>
      <button className={classes.controlButton}>
        <ForwardIcon className="w-6 h-6" />
      </button>
    </div>
  )
}
