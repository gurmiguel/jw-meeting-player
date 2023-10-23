import { SyntheticEvent, useLayoutEffect, useRef, useState } from 'react'
import { PlayerEvents } from '../../electron/events/player'
import { useBridgeEventHandler } from '../hooks/useBridgeEventHandler'
import { DEFAULT_SPEED } from '../../constants'

type MediaItem = Pick<PlayerEvents.Start, 'type' | 'file'> & {
  timestamp: number
}

function Player() {
  const player = useRef<HTMLVideoElement & HTMLAudioElement>(null)

  const [media, setMedia] = useState<MediaItem>()

  const [currentSpeed, setCurrentSpeed] = useState(DEFAULT_SPEED)

  useBridgeEventHandler('start', ({ type, file }) => {
    console.log({type, file})
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

  useLayoutEffect(() => {
    if (!player.current) return

    player.current.playbackRate = currentSpeed
  }, [currentSpeed])

  function handleTimeUpdate(e: SyntheticEvent<HTMLVideoElement>) {
    const video = e.currentTarget

    bridge.time({
      current: video.currentTime,
      duration: video.duration,
    })
  }

  function handleVideoEnded() {
    bridge.stop()
  }

  return (
    <div className="dark:bg-black flex-1 w-full h-full">
      {media && media.type === 'video' && (
        <video
          key={media.timestamp}
          ref={player}
          src={media.file}
          className="block w-full h-full object-contain"
          controls={false}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleVideoEnded}
          autoPlay
        />
      )}
    </div>
  )
}

export default Player
