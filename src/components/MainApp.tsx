import { PhotoIcon, SpeakerWaveIcon, VideoCameraIcon } from '@heroicons/react/24/outline'
import { addDays, format as formatDate, isWeekend, startOfWeek } from 'date-fns'
import { Children, ComponentType, MouseEventHandler, createElement, useEffect, useMemo, useState } from 'react'
import { FetchWeekType } from '../../shared/models/FetchWeekData'
import { useFetchWeekMediaQuery } from '../store/api/week'
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

  const [type, setType] = useState(() => {
    return isWeekend(new Date()) ? FetchWeekType.WEEKEND : FetchWeekType.MIDWEEK
  })

  const { currentData: data, isFetching } = useFetchWeekMediaQuery({ isoDate: currentWeekStart.toISOString(), type })

  const media = useMemo<MediaItem[]>(() => data?.map(item => ({
    file: item.path,
    type: item.type as MediaItem['type'],
    thumbnail: item.thumbnail,
  })) ?? [], [data])

  const createMediaOpenerHandler = (type: NonNullable<PlayerState['type']>, file: string): MouseEventHandler => async (e) => {
    e.preventDefault()

    dispatch(playerActions.start({ type, file }))
  }

  useEffect(() => {
    return () => {
      dispatch(playerActions.stop())
    }
  }, [dispatch, type])

  return (
    <>
      <TitleBar title={document.title} />
      <div className="dark:bg-zinc-900 flex-1 w-full">
        <div className="flex flex-col m-10">
          <div className="flex flex-row items-center">
            <h1>Reunião da Semana - {formatDate(currentWeekStart, 'dd/MM/yyyy')} - {formatDate(addDays(currentWeekStart, 6), 'dd/MM/yyyy')}</h1>

            <select className="ml-3" value={type} onChange={e => setType(parseInt(e.target.value))}>
              <option value={FetchWeekType.MIDWEEK}>Reunião de Meio de Semana</option>
              <option value={FetchWeekType.WEEKEND}>Reunião de Fim de Semana</option>
            </select>
          </div>

          <div className="my-4" />

          <div className="flex flex-wrap w-full gap-5">
            {!isFetching && !data?.length && (
              <h4 className="text-xl italic border p-2 px-4">Nenhuma mídia encontrada</h4>
            )}

            {Children.toArray(media.map(item => (
              <a href="#" onClick={createMediaOpenerHandler(item.type, item.file)} className="relative transition hover:shadow-md hover:shadow-neutral-300/40">
                {item.type === 'audio'
                  ? <AudioPlaceholder file={item.file} />
                  : <img src={item.thumbnail} alt="" className="w-[180px] h-[180px] object-cover" />}
                <div className="absolute top-2 right-2 drop-shadow-sm" title={mediaTips[item.type]}>
                  {createElement(mediaIcons[item.type], { className: 'h-6' })}
                </div>
              </a>
            )))}
          </div>

          {isFetching && <div>Fetching...</div>}
        </div>

        <PlayerInterface />
      </div>
    </>
  )
}

export default MainApp
