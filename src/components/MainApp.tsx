import { ArrowPathIcon, PlusIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'
import { addDays, format as formatDate, isWeekend, startOfWeek } from 'date-fns'
import { groupBy } from 'lodash-es'
import { Children, MouseEventHandler, useEffect, useMemo, useState, useTransition } from 'react'
import { titleBar } from '../../shared/constants'
import { UploadingFile } from '../../shared/models/UploadMedia'
import { WeekType } from '../../shared/models/WeekType'
import { useApiEventHandler } from '../hooks/useApiEventHandler'
import weekApiEndpoints, { useAddSongMutation, useFetchWeekMediaQuery, useLazyRefetchWeekMediaQuery, useUploadMediaMutation } from '../store/api/week'
import { useAppDispatch } from '../store/hooks'
import { playerActions } from '../store/player/slice'
import { DataTransferContainer } from './DataTransferContainer/DataTransferContainer'
import { useDialog } from './Dialog/DialogProvider'
import { MediaItem } from './MediaItem/MediaItem'
import { PlayerInterface } from './PlayerInterface/PlayerInterface'
import { SelectSongDialog } from './SelectSongDialog/SelectSongDialog'
import { TitleBar } from './TitleBar/TitleBar'
import { UploadMetadataDialog } from './UploadMetadataDialog/UploadMetadataDialog'

function MainApp() {
  const dispatch = useAppDispatch()

  const { show: showDialog } = useDialog()

  const today = useMemo(() => new Date(), [])
  const [,startTransition] = useTransition()

  const currentWeekStart = useMemo(() => {
    return startOfWeek(today, { weekStartsOn: 1 })
  }, [today])

  const [type, setType] = useState(() => {
    return isWeekend(today) ? WeekType.WEEKEND : WeekType.MIDWEEK
  })

  const [ refetchWeekData, { isFetching: isRefreshing } ] = useLazyRefetchWeekMediaQuery()
  const { currentData: data, isFetching } = useFetchWeekMediaQuery({
    isoDate: currentWeekStart.toISOString(),
    type,
  }, { refetchOnMountOrArgChange: true })

  const [ uploadMedia, { isLoading: isUploading } ] = useUploadMediaMutation()
  const [ addSong, { isLoading: isAddingSong } ] = useAddSongMutation()

  useApiEventHandler<{ type: WeekType, items: typeof data }>('parsed-results', (response) => {
    if (response.type === type)
      dispatch(weekApiEndpoints.util.upsertQueryData('fetchWeekMedia', { isoDate: currentWeekStart.toISOString(), type }, response.items ?? []))
  }, [dispatch, currentWeekStart, type])

  const isFetchingData = isFetching || isRefreshing

  const mediaGroups = useMemo(() => {
    return groupBy(data ?? [], 'group')
  }, [data])

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
          <div className="flex flex-col p-10" style={{ minHeight: `calc(100vh - ${titleBar.height}px)` }}>
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
                      <MediaItem
                        item={item}
                        type={type}
                        currentWeekStart={currentWeekStart}
                      />
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
