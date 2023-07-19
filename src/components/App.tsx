import { addDays, format as formatDate, startOfWeek } from 'date-fns'
import { Children, MouseEventHandler, useMemo, useState } from 'react'
import { TitleBar } from './TitleBar/TitleBar'
import { PlayerEvents } from '../../electron/events/player'
import { MediaControls } from './MediaControls/MediaControls'

type MediaItem = Pick<PlayerEvents.Start, 'type' | 'file'> & {
  thumbnail: string
}

function App() {
  const [playing, setPlaying] = useState(false)
  const [playStatus, setPlayStatus] = useState<'play' | 'pause'>()

  const currentWeekStart = useMemo(() => {
    const today = new Date()

    return startOfWeek(today, { weekStartsOn: 1 })
  }, [])

  const media = useMemo<MediaItem[]>(() => [
    { type: 'video', file: '/public/sample-video.webm', thumbnail: 'https://picsum.photos/300/300?_=1' },
    { type: 'video', file: '/public/sample-video.webm', thumbnail: 'https://picsum.photos/300/300?_=2' },
    { type: 'video', file: '/public/sample-video.webm', thumbnail: 'https://picsum.photos/300/300?_=3' },
  ], [])

  const createMediaOpenerHandler = (type: PlayerEvents.Start['type'], file: string): MouseEventHandler => e => {
    e.preventDefault()

    bridge.start({ type, file })
    setPlayStatus('play')
    setPlaying(true)
  }

  function handleStop() {
    if (!playing) return

    bridge.stop()
    setPlaying(false)
    setPlayStatus(undefined)
  }

  function handlePause() {
    if (!playing) return
    
    bridge.playerControl({ action: 'pause' })
    setPlayStatus('pause')
  }
  
  function handlePlay() {
    if (!playing) return
    
    bridge.playerControl({ action: 'play' })
    setPlayStatus('play')
  }

  return (
    <>
      <TitleBar title={document.title} />
      <div className="dark:bg-zinc-900 flex-1 w-full">
        <div className="flex flex-col m-10">
          <h1>Reunião da Semana - {formatDate(currentWeekStart, 'dd/MM/yyyy')} - {formatDate(addDays(currentWeekStart, 6), 'dd/MM/yyyy')}</h1>

          <div className="my-4" />

          <div className="flex flex-wrap w-full gap-5">
            {Children.toArray(media.map(item => (
              <a href="#" onClick={createMediaOpenerHandler(item.type, item.file)} className="transition hover:shadow-md hover:shadow-neutral-300/40">
                <img src={item.thumbnail} alt="" className="w-[260px] h-[180px] object-cover" />
              </a>
            )))}
          </div>
        </div>

        <MediaControls
          playing={playing}
          playStatus={playStatus}
          onStop={handleStop}
          onPlay={handlePlay}
          onPause={handlePause}
        />
      </div>
    </>
  )
}

export default App
