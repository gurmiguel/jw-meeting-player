import { ArrowPathIcon, PhotoIcon, PlusIcon, SpeakerWaveIcon, VideoCameraIcon, XMarkIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'
import { addDays, format as formatDate, isWeekend, startOfWeek } from 'date-fns'
import { groupBy } from 'lodash-es'
import { Children, ComponentType, MouseEventHandler, createElement, useEffect, useMemo, useState, useTransition } from 'react'
import { ProcessedResult } from '../../electron/api/parser/types'
import { UploadingFile } from '../../shared/models/UploadMedia'
import { WeekType } from '../../shared/models/WeekType'
import { PlayerState } from '../../shared/state'
import { useAddSongMutation, useFetchWeekMediaQuery, useLazyRefetchWeekMediaQuery, useRemoveMediaMutation, useUploadMediaMutation } from '../store/api/week'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import { playerActions } from '../store/player/slice'
import { AudioPlaceholder } from './AudioPlaceholder/AudioPlaceholder'
import { useConfirmDialog } from './ConfirmDialog/hook'
import { DataTransferContainer } from './DataTransferContainer/DataTransferContainer'
import { useDialog } from './Dialog/DialogProvider'
import { PlayerInterface } from './PlayerInterface/PlayerInterface'
import { SelectSongDialog } from './SelectSongDialog/SelectSongDialog'
import { TitleBar } from './TitleBar/TitleBar'
import { UploadMetadataDialog } from './UploadMetadataDialog/UploadMetadataDialog'

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

  const { show: showDialog } = useDialog()
  const promptConfirm = useConfirmDialog()

  const today = useMemo(() => new Date(), [])
  const [,startTransition] = useTransition()

  const currentWeekStart = useMemo(() => {
    return startOfWeek(today, { weekStartsOn: 1 })
  }, [today])

  const [type, setType] = useState(() => {
    return isWeekend(today) ? WeekType.WEEKEND : WeekType.MIDWEEK
  })

  const currentPlayingFile = useAppSelector(state => state.player.file)

  const [ refetchWeekData, { isFetching: isRefreshing } ] = useLazyRefetchWeekMediaQuery()
  const { currentData, isFetching } = useFetchWeekMediaQuery({
    isoDate: currentWeekStart.toISOString(),
    type,
  }, { refetchOnMountOrArgChange: true })

  const data = isRefreshing ? undefined : currentData

  const [ uploadMedia, { isLoading: isUploading } ] = useUploadMediaMutation()
  const [ removeMedia ] = useRemoveMediaMutation()
  const [ addSong, { isLoading: isAddingSong } ] = useAddSongMutation()

  const isFetchingData = isFetching || isRefreshing

  const mediaGroups = useMemo(() => {
    return groupBy(data ?? [], 'group')
  }, [data])

  const createMediaOpenHandler = (item: ProcessedResult): MouseEventHandler => async (e) => {
    e.preventDefault()

    dispatch(playerActions.start({ type: item.type, file: item.media[0].path }))
  }

  const createMediaRemoveHandler = (item: ProcessedResult): MouseEventHandler => async (e) => {
    e.preventDefault()

    if (await promptConfirm('Deseja realmente excluir este item?')) {
      await removeMedia({ isoDate: currentWeekStart.toISOString(), type, item })

      if (currentPlayingFile === item.media[0].path)
        dispatch(playerActions.stop())
    }
  }

  const createAddSongHandler = (group: string): MouseEventHandler => async (e) => {
    e.preventDefault()

    try {
      const song = await new Promise<number>((resolve, reject) => {
        showDialog((
          <SelectSongDialog
            onSubmit={resolve}
          />
        ), {
          onDismiss: reject,
          disableOverlayDismiss: true,
        })
      })
  
      addSong({ isoDate: currentWeekStart.toISOString(), type, group, song })
    } catch { /* empty */ }
  }

  async function handleDataTransfer(files: File[]) {
    try {
      const uploadingFiles = new Array<UploadingFile>()
      for (const file of files) {
        const { group, label } = await new Promise<Omit<UploadingFile, 'file'>>((resolve, reject) => {
          showDialog((
            <UploadMetadataDialog
              onSubmit={resolve}
              groups={Object.keys(mediaGroups)}
              defaultGroup="Outros"
              defaultLabel={file.name}
            />
          ), {
            onDismiss: reject,
            disableOverlayDismiss: true,
          })
        })
        uploadingFiles.push({ file: { name: file.name, path: file.path }, group, label })
      }

      await uploadMedia({ isoDate: currentWeekStart.toISOString(), type, files: uploadingFiles }).unwrap()
    } catch { /* empty */ }
  }

  useEffect(() => {
    return () => {
      dispatch(playerActions.stop())
    }
  }, [dispatch, type])

  return (
    <>
      <TitleBar title={document.title} />
      <div className="h-screen overflow-hidden overflow-y-scroll">
        <DataTransferContainer onTransfer={handleDataTransfer} validFormats={['image/', 'audio/', 'video/']} className="dark:bg-zinc-900 flex-1 w-full">
          <div className="flex flex-col p-10">
            <div className="flex flex-row items-center justify-end">
              <h1 className="cursor-default ml-0 mr-auto">Semana - {formatDate(currentWeekStart, 'dd/MM/yyyy')} - {formatDate(addDays(currentWeekStart, 6), 'dd/MM/yyyy')}</h1>
            </div>

            <div className="flex justify-between items-center">
              <select
                value={type}
                onChange={e => {
                  startTransition(() => setType(parseInt(e.target.value)))
                }}
              >
                <option value={WeekType.MIDWEEK}>Reunião de Meio de Semana</option>
                <option value={WeekType.WEEKEND}>Reunião de Fim de Semana</option>
              </select>

              <button
                type="button"
                onClick={() => refetchWeekData({ isoDate: currentWeekStart.toISOString(), type })}
                className="flex items-center p-2 px-4 bg-transparent border enabled:hover:bg-zinc-500/50 disabled:opacity-50 transition-colors"
                disabled={isFetchingData}
              >
              Recarregar
                <ArrowPathIcon className="h-5 ml-1.5 data-[loading=true]:animate-spin" data-loading={isFetchingData} />
              </button>
            </div>

            <div className="my-4" />

            <div className="flex flex-wrap flex-col w-full">
              {isFetchingData && !data?.length && <div>Carregando mídias...</div>}

              {!isFetchingData && !data?.length && (
                <h4 className="text-xl italic border p-2 px-4">Nenhuma mídia encontrada</h4>
              )}

              {Object.entries(mediaGroups).map(([ group, items ]) => (
                <details key={group} open>
                  <summary className="p-2 pl-4 cursor-pointer hover:bg-zinc-300/5">{group}</summary>
                  <div className="flex flex-wrap w-full items-start gap-5 mt-3 mb-3">
                    {Children.toArray(items.map(item => (
                      <div className="relative w-[180px]" title={item.label}>
                        <a href="#" onClick={createMediaOpenHandler(item)} className="flex w-full transition hover:shadow-md hover:shadow-neutral-300/40">
                          {item.type === 'audio'
                            ? <AudioPlaceholder file={item.media[0].path} />
                            : <img src={item.media.find(it => it.type === 'image')?.path} alt="" className="w-full aspect-square object-cover" />}
                          <div className="absolute top-2 right-2 icon-shadow" title={mediaTips[item.type]}>
                            {createElement(mediaIcons[item.type], { className: 'h-6 text-zinc-100', strokeWidth: 1.5 })}
                          </div>
                        </a>
                        {item.manual && (
                          <button className="appearance-none absolute top-2 left-2 bg-transparent icon-shadow" title="Excluir" type="button" onClick={createMediaRemoveHandler(item)}>
                            <XMarkIcon className="h-6 text-red-700" strokeWidth="3" />
                          </button>
                        )}
                        <p className="cursor-default text-md w-full mt-1.5 line-clamp-2 leading-5">{item.label}</p>
                      </div>
                    )))}
                    {group.toLowerCase() === 'cânticos' && (
                      <button
                        type="button"
                        className={clsx(
                          'appearance-none relative flex items-center justify-center',
                          'w-[180px] aspect-square',
                          'rounded-md border border-dashed border-zinc-900 dark:border-zinc-300 bg-transparent',
                          !isAddingSong && 'cursor-pointer hover:bg-zinc-300/30 transition-colors',
                          'disabled:opacity-80',
                        )}
                        title="Adicionar Cântico"
                        onClick={createAddSongHandler(group)}
                        disabled={isAddingSong}
                      >
                        {isAddingSong
                          ? <ArrowPathIcon className="w-20 animate-spin" />
                          : <PlusIcon className="w-20" />}
                      </button>
                    )}
                  </div>
                </details>
              ))}
            </div>
          </div>

          <PlayerInterface />

          {isUploading && (
            <div className="absolute top-0 left-0 w-full h-full flex z-10 items-center justify-center bg-zinc-900/30">
              <ArrowPathIcon className="h-12 animate-spin text-zinc-100" />
            </div>
          )}
        </DataTransferContainer>
      </div>
    </>
  )
}

export default MainApp
