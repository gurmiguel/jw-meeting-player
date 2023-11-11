import { SyntheticEvent, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { PlayerEvents } from '../../electron/events/player'
import { DEFAULT_SPEED } from '../../shared/constants'
import { useBridgeEventHandler } from '../hooks/useBridgeEventHandler'
import { initialState as initialPlayer } from '../store/player/slice'
import classes from './Player.module.css'

type MediaItem = Pick<PlayerEvents.Start, 'type' | 'file'> & {
  timestamp: number
}

function Player() {
  const player = useRef<HTMLVideoElement & HTMLAudioElement>(null)

  const [media, setMedia] = useState<MediaItem>()
  const [yearText, setYearText] = useState<string>()

  const [currentSpeed, setCurrentSpeed] = useState(initialPlayer.playRate)

  const [{ zoomLevel, position }, setZoomNPos] = useState({
    zoomLevel: initialPlayer.zoomLevel,
    position: initialPlayer.position,
  })

  useBridgeEventHandler('start', ({ type, file, playRate }) => {
    setCurrentSpeed(playRate)
    setMedia({ type, file, timestamp: Date.now() })

    common.windowShow()
  }, [])

  useBridgeEventHandler('playerControl', ({ action }) => {
    switch (action) {
      case 'play':
        return player.current?.play()
      case 'pause':
        return player.current?.pause()
    }
  }, [])

  useBridgeEventHandler('stop', () => {
    setMedia(undefined)
    setCurrentSpeed(DEFAULT_SPEED)
  }, [])

  useBridgeEventHandler('setSpeed', ({ speed }) => {
    setCurrentSpeed(speed)
  }, [])

  useBridgeEventHandler('seek', ({ position }) => {
    if (!player.current) return

    player.current.currentTime = position
  }, [])

  useBridgeEventHandler('zoom', ({ zoomLevel, top, left }) => {
    setZoomNPos({ zoomLevel, position: { top, left } })
  }, [])

  useLayoutEffect(() => {
    if (!player.current) return

    player.current.playbackRate = currentSpeed
  }, [currentSpeed])

  useEffect(() => {
    api.fetch<string>('get-year-text', { year: new Date().getFullYear() })
      .then((yearText) => setYearText(yearText))
  }, [])

  function handleTimeUpdate(e: SyntheticEvent<HTMLVideoElement>) {
    const video = e.currentTarget

    bridge.time({
      current: video.currentTime,
      duration: video.duration,
    })
  }

  function handleMediaEnded() {
    bridge.stop({ propagate: true })
  }

  return (
    <div className="relative dark:bg-black flex-1 w-full h-full pointer-events-none select-none overflow-hidden">
      {!media?.file && !!yearText && (
        <>
          <div className={classes.yearText} dangerouslySetInnerHTML={{ __html: yearText }} />
          <div className={classes.yearTextLogo}>
            <div className={classes.yearTextLogoInner}></div>
          </div>
        </>
      )}

      {media?.file && media.type === 'video' && (
        <video
          key={media.timestamp}
          ref={player}
          src={media.file}
          className="block w-full h-full object-contain"
          controls={false}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleMediaEnded}
          autoPlay
        />
      )}
      {media?.file && media.type === 'audio' && (
        <audio
          key={media.timestamp}
          ref={player}
          src={media.file}
          className="block w-full h-full object-contain"
          controls={false}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleMediaEnded}
          autoPlay
        />
      )}
      {media?.file && media.type === 'image' && (
        <img
          key={media.timestamp}
          src={media.file}
          className="absolute block w-full aspect-auto max-w-none object-contain animate-[fade-in_1s_ease]"
          alt=""
          style={{
            transformOrigin: '0 0',
            transform: `scale(${zoomLevel}) translate(-${position.left}%, -${position.top}%)`,
            // transform: `scale(${zoomLevel}) translate(-${position.top}%, -${position.left}%)`,
          }}
        />
      )}
    </div>
  )
}

export default Player
