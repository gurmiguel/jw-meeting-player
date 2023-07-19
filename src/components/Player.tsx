import { useRef, useState } from 'react'
import { PlayerEvents } from '../../electron/events/player'
import { useBridgeEventHandler } from '../hooks/useBridgeEventHandler'

type MediaItem = Pick<PlayerEvents.Start, 'type' | 'file'> & {
  timestamp: number
}

function Player() {
  const player = useRef<HTMLVideoElement & HTMLAudioElement>(null)

  const [media, setMedia] = useState<MediaItem>()

  useBridgeEventHandler('start', (_, { type, file }) => {
    setMedia({ type, file, timestamp: Date.now() })

    common.windowShow()
  }, [])

  useBridgeEventHandler('playerControl', (_, { action }) => {
    switch (action) {
      case 'play':
        return player.current?.play()
      case 'pause':
        return player.current?.pause()
    }
  }, [])

  useBridgeEventHandler('stop', () => {
    setMedia(undefined)
  }, [])

  return (
    <div className="dark:bg-black flex-1 w-full h-full">
      {media && media.type === 'video' && (
        <video key={media.timestamp} ref={player} src={media.file} className="block w-full h-full object-contain" controls={false} autoPlay />
      )}
    </div>
  )
}

export default Player
