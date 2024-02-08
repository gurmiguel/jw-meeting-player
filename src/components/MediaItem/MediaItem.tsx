import { PhotoIcon, SpeakerWaveIcon, VideoCameraIcon, XMarkIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'
import { ComponentType, MouseEvent, createElement, useCallback } from 'react'
import { ProcessedResult } from '../../../electron/api/crawler/types'
import { WeekType } from '../../../shared/models/WeekType'
import { MediaItem as MediaItemType } from '../../../shared/state'
import { formatDuration } from '../../../shared/utils'
import loadingGif from '../../assets/loading.gif?asset'
import { useApiEventHandler } from '../../hooks/useApiEventHandler'
import { useDebounceValue } from '../../hooks/useDebounceValue'
import { useThrottleCallback } from '../../hooks/useThrottleCallback'
import { getFilename } from '../../lib/utils'
import { useRemoveMediaMutation, useUpdateMediaProgressMutation } from '../../store/api/week'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { playerActions } from '../../store/player/slice'
import { AudioPlaceholder } from '../AudioPlaceholder/AudioPlaceholder'
import { useConfirmDialog } from '../ConfirmDialog/hook'
import { ProgressBar } from '../ProgressBar/ProgressBar'

interface MediaItemProps {
  item: ProcessedResult
  type: WeekType
  currentWeekStart: Date
}

const mediaIcons: Record<MediaItemType['type'], ComponentType<any>> = {
  image: PhotoIcon,
  audio: SpeakerWaveIcon,
  video: VideoCameraIcon,
}

const mediaTips: Record<MediaItemType['type'], string> = {
  image: 'Imagem',
  audio: 'Áudio',
  video: 'Vídeo',
}

export function MediaItem({ item, type, currentWeekStart }: MediaItemProps) {
  const promptConfirm = useConfirmDialog()

  const dispatch = useAppDispatch()

  const currentPlayingFile = useAppSelector(state => state.player.file)

  const [ removeMedia ] = useRemoveMediaMutation()
  const [ updateMediaProgress ] = useUpdateMediaProgressMutation()

  const mainMedia = item.media[0]

  const updateMainMediaProgress = useThrottleCallback(useCallback((progress: number) => {
    updateMediaProgress({
      isoDate: currentWeekStart.toISOString(),
      type,
      mediaPath: getFilename(mainMedia.path),
      progress: progress,
    })
  }, [currentWeekStart, mainMedia.path, type, updateMediaProgress]), 100)

  useApiEventHandler<{ progress: number }>(`media-progress/${getFilename(mainMedia.path)}`, (response) => {
    updateMainMediaProgress(response.progress)
  }, [updateMediaProgress])

  async function mediaOpenHandler(e: MouseEvent) {
    e.preventDefault()

    dispatch(playerActions.start({ type: item.type, file: mainMedia.path }))
  }

  async function mediaRemoveHandler(e: MouseEvent) {
    e.preventDefault()

    if (await promptConfirm('Deseja realmente excluir este item?')) {
      await removeMedia({ isoDate: currentWeekStart.toISOString(), type, item })

      if (currentPlayingFile === mainMedia.path)
        dispatch(playerActions.stop())
    }
  }

  const downloadProgress = mainMedia.downloadProgress ?? 100
  const downloadFinished = useDebounceValue(downloadProgress === 100, 250)

  return (
    <div className={clsx('relative w-[180px]', !downloadFinished && 'opacity-70 pointer-events-none')} title={item.label}>
      <a href="#" onClick={mediaOpenHandler} className="relative flex w-full transition hover:shadow-md hover:shadow-neutral-300/40">
        {item.type === 'audio'
          ? <AudioPlaceholder file={mainMedia.path} />
          : <img src={!downloadFinished ? loadingGif : item.media.find(it => it.type === 'image')?.path} alt="" className="w-full aspect-square object-cover" />}
        <div className="absolute top-2 right-2 icon-shadow" title={mediaTips[item.type]}>
          {createElement(mediaIcons[item.type], { className: 'h-6 text-zinc-100', strokeWidth: 1.5 })}
        </div>
        <ProgressBar progress={downloadProgress} className="absolute-center top-auto bottom-2 w-11/12" />
        {downloadFinished && mainMedia.duration && (
          <div className="absolute bottom-0 right-0 shadow-sm px-1.5 font-semibold text-white bg-zinc-800">
            {formatDuration(mainMedia.duration)}
          </div>
        )}
      </a>
      {item.manual && (
        <button className="appearance-none absolute top-2 left-2 bg-transparent icon-shadow" title="Excluir" type="button" onClick={mediaRemoveHandler}>
          <XMarkIcon className="h-6 text-red-700" strokeWidth="3" />
        </button>
      )}
      <p className="cursor-default text-md w-full mt-1.5 line-clamp-2 leading-5">{item.label}</p>
    </div>
  )
}
