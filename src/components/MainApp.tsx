import { ArrowPathIcon, PhotoIcon, SpeakerWaveIcon, VideoCameraIcon } from '@heroicons/react/24/outline'
import { addDays, format as formatDate, isWeekend, startOfWeek } from 'date-fns'
import { groupBy, uniqueId } from 'lodash-es'
import { Children, ComponentType, MouseEventHandler, createElement, useEffect, useMemo, useState, useTransition } from 'react'
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

  const today = useMemo(() => new Date(), [])
  const [,startTransition] = useTransition()

  const currentWeekStart = useMemo(() => {
    return startOfWeek(today, { weekStartsOn: 1 })
  }, [today])

  const [type, setType] = useState(() => {
    return isWeekend(today) ? FetchWeekType.WEEKEND : FetchWeekType.MIDWEEK
  })
  const [forceSeed, setForceSeed] = useState<number>(0)

  const { currentData: data, isFetching } = useFetchWeekMediaQuery({ isoDate: currentWeekStart.toISOString(), type, forceSeed })

  const mediaGroups = useMemo(() => {
    return groupBy(data ?? [], 'group')
  }, [data])

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
          <div className="flex flex-row items-center justify-end">
            <h1 className="cursor-default ml-0 mr-auto">Reunião da Semana - {formatDate(currentWeekStart, 'dd/MM/yyyy')} - {formatDate(addDays(currentWeekStart, 6), 'dd/MM/yyyy')}</h1>

            <button
              type="button"
              onClick={() => setForceSeed(parseInt(uniqueId()))}
              className="flex items-center p-2 px-4 bg-zinc-500/40 enabled:hover:bg-zinc-500/50 disabled:opacity-50 transition-colors"
              disabled={isFetching}
            >
              Recarregar
              <ArrowPathIcon className="h-5 ml-1.5 data-[loading=true]:animate-spin" data-loading={isFetching} />
            </button>

            <select
              className="ml-3 h-10 px-3"
              value={type}
              onChange={e => {
                startTransition(() => {
                  setType(parseInt(e.target.value))
                  setForceSeed(0)
                })
              }}
            >
              <option value={FetchWeekType.MIDWEEK}>Reunião de Meio de Semana</option>
              <option value={FetchWeekType.WEEKEND}>Reunião de Fim de Semana</option>
            </select>
          </div>

          <div className="my-4" />

          <div className="flex flex-wrap flex-col w-full">
            {!isFetching && !data?.length && (
              <h4 className="text-xl italic border p-2 px-4">Nenhuma mídia encontrada</h4>
            )}

            {Object.entries(mediaGroups).map(([ group, items ]) => (
              <details key={group} open>
                <summary className="p-2 pl-4 cursor-pointer hover:bg-zinc-300/5">{group}</summary>
                <div className="flex flex-wrap w-full gap-5 mt-3 mb-3">
                  {Children.toArray(items.map(item => (
                    <div className="w-[180px]" title={item.label}>
                      <a href="#" onClick={createMediaOpenerHandler(item.type, item.media[0].path)} className="flex relative w-full transition hover:shadow-md hover:shadow-neutral-300/40">
                        {item.type === 'audio'
                          ? <AudioPlaceholder file={item.media[0].path} />
                          : <img src={item.media.find(it => it.type === 'image')?.path} alt="" className="w-full aspect-square object-cover" />}
                        <div className="absolute top-2 right-2 icon-shadow" title={mediaTips[item.type]}>
                          {createElement(mediaIcons[item.type], { className: 'h-6 text-zinc-100', strokeWidth: 1.5 })}
                        </div>
                      </a>
                      <p className="cursor-default text-md w-full mt-1.5 line-clamp-2 leading-5">{item.label}</p>
                    </div>
                  )))}
                </div>
              </details>
            ))}
          </div>

          {isFetching && <div>Carregando mídias...</div>}
        </div>

        <PlayerInterface />
      </div>
    </>
  )
}

export default MainApp
