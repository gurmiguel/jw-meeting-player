import { PhotoIcon, SpeakerWaveIcon, VideoCameraIcon } from '@heroicons/react/24/outline'
import { addDays, format as formatDate, startOfWeek } from 'date-fns'
import { Children, ComponentType, MouseEventHandler, createElement, useEffect, useMemo } from 'react'
import { useAppDispatch } from '../store/hooks'
import { PlayerState, playerActions } from '../store/player/slice'
import { AudioPlaceholder } from './AudioPlaceholder/AudioPlaceholder'
import { PlayerInterface } from './PlayerInterface/PlayerInterface'
import { TitleBar } from './TitleBar/TitleBar'

type MediaItem = NonNullableObject<Pick<PlayerState, 'type' | 'file'>> & ({
  type: 'video' | 'image'
  thumbnail: string
} | {
  type: 'audio'
})

const mediaIcons: Record<MediaItem['type'], ComponentType<any>> = {
  image: PhotoIcon,
  audio: SpeakerWaveIcon,
  video: VideoCameraIcon,
}

const mediaTips: Record<MediaItem['type'], string> = {
  image: 'Imagem',
  audio: 'Áudio',
  video: 'Vídeo',
}

function MainApp() {
  const dispatch = useAppDispatch()

  const currentWeekStart = useMemo(() => {
    const today = new Date()

    return startOfWeek(today, { weekStartsOn: 1 })
  }, [])

  const media = useMemo<MediaItem[]>(() => [
    { type: 'video', file: '/sample-video.webm', thumbnail: 'https://picsum.photos/300/300?_=1' },
    { type: 'image', file: 'https://picsum.photos/1920/1080', thumbnail: 'https://picsum.photos/200/300' },
    { type: 'audio', file: '/sample-audio.opus' },
  ], [])

  const createMediaOpenerHandler = (type: NonNullable<PlayerState['type']>, file: string): MouseEventHandler => async (e) => {
    e.preventDefault()

    dispatch(playerActions.start({ type, file }))
  }

  useEffect(() => {
    // api.fetchWeekMedia({ isoDate: new Date().toISOString() }).then(res => {
    //   console.log(res)
    // })
  }, [])

  return (
    <>
      <TitleBar title={document.title} />
      <div className="dark:bg-zinc-900 flex-1 w-full">
        <div className="flex flex-col m-10">
          <h1>Reunião da Semana - {formatDate(currentWeekStart, 'dd/MM/yyyy')} - {formatDate(addDays(currentWeekStart, 6), 'dd/MM/yyyy')}</h1>

          <div className="my-4" />

          <div className="flex flex-wrap w-full gap-5">
            {Children.toArray(media.map(item => (
              <a href="#" onClick={createMediaOpenerHandler(item.type, item.file)} className="relative transition hover:shadow-md hover:shadow-neutral-300/40">
                {item.type === 'audio'
                  ? <AudioPlaceholder file={item.file} />
                  : <img src={item.thumbnail} alt="" className="w-[260px] h-[180px] object-cover" />}
                <div className="absolute top-2 right-2 drop-shadow-sm" title={mediaTips[item.type]}>
                  {createElement(mediaIcons[item.type], { className: 'h-6' })}
                </div>
              </a>
            )))}
          </div>
        </div>

        <PlayerInterface />
      </div>
    </>
  )
}

export default MainApp
