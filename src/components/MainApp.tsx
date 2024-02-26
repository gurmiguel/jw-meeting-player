import { ArrowPathIcon, ArrowTopRightOnSquareIcon, CalendarDaysIcon, ChevronLeftIcon, ChevronRightIcon, PlusIcon, XMarkIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'
import { addDays, addWeeks, format as formatDate, getWeek, isWeekend, startOfWeek } from 'date-fns'
import { groupBy } from 'lodash-es'
import { Children, MouseEventHandler, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { UploadingFile } from '../../shared/models/UploadMedia'
import { WeekType } from '../../shared/models/WeekType'
import { StorageKeys } from '../../shared/storage-keys'
import { getWOLUrl } from '../../shared/utils'
import loadingGif from '../assets/loading.gif?asset'
import { useApiEventHandler } from '../hooks/useApiEventHandler'
import { useStorageValue } from '../hooks/useStorageValue'
import weekApiEndpoints, { useAddSongMutation, useLazyFetchWeekMediaQuery, useLazyRefetchWeekMediaQuery, usePreloadMeetingMutation, useUploadMediaMutation } from '../store/api/week'
import { useAppDispatch } from '../store/hooks'
import { playerActions } from '../store/player/slice'
import { DataTransferContainer } from './DataTransferContainer/DataTransferContainer'
import { useDialog } from './Dialog/DialogProvider'
import { MediaItem } from './MediaItem/MediaItem'
import { PlayerInterface } from './PlayerInterface/PlayerInterface'
import { SelectSongDialog } from './SelectSongDialog/SelectSongDialog'
import { UploadMetadataDialog } from './UploadMetadataDialog/UploadMetadataDialog'

function MainApp() {
  const dispatch = useAppDispatch()
  
  const [,startTransition] = useTransition()

  const { show: showDialog } = useDialog()

  const [date, setDate] = useState(() => new Date())
  const isToday = useMemo(() => formatDate(date, 'yyyy-MM-dd') === formatDate(new Date(), 'yyyy-MM-dd'),[date])

  const [autoLoadNextMeeting, setAutoLoadNextMeeting] = useStorageValue<boolean>(StorageKeys.autoLoadNextMeeting)

  const currentWeekStart = useMemo(() => {
    return startOfWeek(date, { weekStartsOn: 1 })
  }, [date])
  const weekNumber = useMemo(() => getWeek(currentWeekStart, { weekStartsOn: 1 }), [currentWeekStart])

  const [type, setType] = useState(() => {
    return isWeekend(date) ? WeekType.WEEKEND : WeekType.MIDWEEK
  })

  const [ refetchWeekData, { isFetching: isRefreshing } ] = useLazyRefetchWeekMediaQuery()
  const [ fetchWeekData, { currentData: data, isFetching }] = useLazyFetchWeekMediaQuery()
  const [preloadMeeting] = usePreloadMeetingMutation()

  useEffect(() => {
    fetchWeekData({
      isoDate: currentWeekStart.toISOString(),
      type,
    }, false)
      .unwrap()
      .then(async () => {
        const autoLoadNextMeeting = await common.storage.get<boolean>(StorageKeys.autoLoadNextMeeting)
        if (autoLoadNextMeeting){
          let nextMeetingDate = currentWeekStart
          if (type === WeekType.WEEKEND)
            nextMeetingDate = addWeeks(nextMeetingDate, 1)
          const nextMeetingType = Object.values(WeekType).find(it => typeof it === typeof type && it !== type) as WeekType
        
          console.log('Loading next meeting media', nextMeetingDate.toISOString(), WeekType[nextMeetingType])

          preloadMeeting({ isoDate: nextMeetingDate.toISOString(), type: nextMeetingType })
        }
      })
  }, [currentWeekStart, fetchWeekData, preloadMeeting, type])

  const [ uploadMedia, { isLoading: isUploading } ] = useUploadMediaMutation()
  const [ addSong, { isLoading: isAddingSong } ] = useAddSongMutation()

  const lastSelectedGroup = useRef('Outros')

  useApiEventHandler<{ type: WeekType, week: number, items: typeof data }>(`parsed-results/${weekNumber}`, (response) => {
    if (response.type === type)
      dispatch(weekApiEndpoints.util.upsertQueryData('fetchWeekMedia', { isoDate: currentWeekStart.toISOString(), type }, response.items ?? []))
  }, [dispatch, currentWeekStart, type])

  const isFetchingData = isFetching || isRefreshing

  const hasFoundMedia = useMemo(() => data?.some(it => !it.manual) ?? true, [data])

  const mediaGroups = useMemo(() => {
    return !data
      ? {}
      : data.length || isFetchingData
        ? groupBy(data ?? [], 'group')
        : { 'Cânticos': [] }
  }, [data, isFetchingData])

  const createWeekChangeHandler = (action: 'before' | 'after'): MouseEventHandler => async (e) => {
    e.preventDefault()

    let gotoWeek: Date
    switch (action) {
      case 'before':
        gotoWeek = addWeeks(date, -1)
        break
      case 'after':
        gotoWeek = addWeeks(date, 1)
        break
    }

    setDate(gotoWeek)
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
              defaultGroup={lastSelectedGroup.current}
              defaultLabel={file.name}
            />
          ), {
            onDismiss: reject,
            disableOverlayDismiss: true,
          })
        })
        uploadingFiles.push({ file: { name: file.name, path: file.path }, group, label })
        lastSelectedGroup.current = group
      }

      await uploadMedia({ isoDate: currentWeekStart.toISOString(), type, files: uploadingFiles }).unwrap()
    } catch { /* empty */ }
  }

  function handleRefreshData() {
    refetchWeekData({ isoDate: currentWeekStart.toISOString(), type })
  }

  useEffect(() => {
    return () => {
      dispatch(playerActions.stop())
    }
  }, [dispatch, type])

  return (
    <>
      <div className="h-screen overflow-hidden overflow-y-scroll">
        <DataTransferContainer onTransfer={handleDataTransfer} validFormats={['image/', 'audio/', 'video/']} className="dark:bg-zinc-900 flex-1 w-full">
          <div className="flex flex-col p-10 min-h-screen">
            <div key={date.getTime()} className="flex flex-row items-center justify-start gap-3 -mx-2 mb-2">
              <button
                type="button"
                className="appearance-none bg-transparent p-2 border-0 hover:opacity-80"
                onClick={createWeekChangeHandler('before')}
                title="Abrir a semana anterior"
              >
                <ChevronLeftIcon className="h-5" />
              </button>
              <h1 className="mb-0 cursor-default flex items-center gap-3">
                <button
                  type="button"
                  className="appearance-none bg-transparent p-2 border-0 hover:opacity-80 disabled:opacity-40"
                  onClick={() => setDate(new Date())}
                  title="Abrir semana para hoje"
                  disabled={isToday}
                >
                  <CalendarDaysIcon className="h-5" />
                </button>

                Semana • {formatDate(currentWeekStart, 'dd/MM/yyyy')} - {formatDate(addDays(currentWeekStart, 6), 'dd/MM/yyyy')}

                <a href={getWOLUrl(date)} target="_blank" className="-mt-3" title="Abrir na Biblioteca Online">
                  <ArrowTopRightOnSquareIcon className="h-4" />
                </a>
              </h1>
              <button
                type="button"
                className="appearance-none bg-transparent p-2 border-0 hover:opacity-80"
                onClick={createWeekChangeHandler('after')}
                title="Abrir a próxima semana"
              >
                <ChevronRightIcon className="h-5" />
              </button>

              <div className="flex items-center ml-auto mr-0">
                <label className="flex flex-row items-center gap-3">
                  <span className="text-sm italic">Pré-carregar próxima reunião</span>
                  <input
                    type="checkbox"
                    checked={autoLoadNextMeeting}
                    onChange={() => setAutoLoadNextMeeting(value => !value)}
                    style={{ appearance: 'checkbox' }}
                  />
                </label>
              </div>
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
                onClick={handleRefreshData}
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

              {!isFetchingData && !hasFoundMedia && (
                <h4 className="flex items-center gap-1 text-sm italic mb-4 underline underline-offset-4">
                  <XMarkIcon className="h-4 text-red-700" />
                  Nenhuma mídia encontrada
                  <XMarkIcon className="h-4 text-red-700" />
                </h4>
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
                          ? <img src={loadingGif} className="w-full aspect-square object-cover" />
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
