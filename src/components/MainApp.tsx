import { DndContext, DragOverEvent, DragOverlay, DragStartEvent, KeyboardSensor, PointerSensor, useDroppable, useSensor, useSensors } from '@dnd-kit/core'
import { restrictToFirstScrollableAncestor } from '@dnd-kit/modifiers'
import { SortableContext, arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { ArrowPathIcon, ArrowTopRightOnSquareIcon, CalendarDaysIcon, ChevronLeftIcon, ChevronRightIcon, PlusIcon, XMarkIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'
import { addDays, addWeeks, format as formatDate, getWeek, isWeekend, startOfWeek } from 'date-fns'
import { ProgressInfo, type UpdateInfo } from 'electron-updater'
import { MouseEventHandler, PropsWithChildren, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { ProcessedResult } from '../../electron/api/crawler/types'
import { UploadingFile } from '../../shared/models/UploadMedia'
import { WeekType } from '../../shared/models/WeekType'
import { StorageKeys } from '../../shared/storage-keys'
import { getWOLWeekUrl } from '../../shared/utils'
import loadingGif from '../assets/loading.gif?asset'
import { useApiEventHandler } from '../hooks/useApiEventHandler'
import { useStorageValue } from '../hooks/useStorageValue'
import weekApiEndpoints, { useAddSongMutation, useFetchWeekMediaQuery, useLazyRefetchWeekMediaQuery, usePreloadMeetingMutation, useUpdateMetadataMutation, useUploadMediaMutation } from '../store/api/week'
import { useAppDispatch } from '../store/hooks'
import { playerActions } from '../store/player/slice'
import { BibleWidget } from './Bible/BibleWidget'
import { DataTransferContainer } from './DataTransferContainer/DataTransferContainer'
import { useDialog } from './Dialog/DialogProvider'
import { MediaItem, SortableMediaItem } from './MediaItem/MediaItem'
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
  const { currentData: data, isFetching, isSuccess: hasFetchedWeekMedia } = useFetchWeekMediaQuery({ isoDate: currentWeekStart.toISOString(), type })
  const [preloadMeeting] = usePreloadMeetingMutation()

  const [sortingItems, setSortingItems] = useState<ProcessedResult[]>()

  useEffect(() => {
    if (!hasFetchedWeekMedia) return

    (async () => {
      const autoLoadNextMeeting = await common.storage.get<boolean>(StorageKeys.autoLoadNextMeeting)
      if (autoLoadNextMeeting){
        let nextMeetingDate = currentWeekStart
        if (type === WeekType.WEEKEND)
          nextMeetingDate = addWeeks(nextMeetingDate, 1)
        const nextMeetingType = Object.values(WeekType).find(it => typeof it === typeof type && it !== type) as WeekType
      
        console.log('Loading next meeting media', nextMeetingDate.toISOString(), WeekType[nextMeetingType])

        preloadMeeting({ isoDate: nextMeetingDate.toISOString(), type: nextMeetingType })
      }
    })()
  }, [currentWeekStart, hasFetchedWeekMedia, preloadMeeting, type])

  const [ uploadMedia, { isLoading: isUploading } ] = useUploadMediaMutation()
  const [ addSong, { isLoading: isAddingSong } ] = useAddSongMutation()
  const [ updateMetadata ] = useUpdateMetadataMutation()

  const lastSelectedGroup = useRef('Outros')

  useApiEventHandler<UpdateInfo>('update-available', updateInfo => {
    toast(`Uma atualização está disponível - Versão ${updateInfo.version}`, {
      id: 'update-toast',
      duration: 60_000,
      action: {
        label: 'Baixar',
        onClick(e) {
          e.preventDefault()
          toast('Baixando atualização - 0%', {
            id: 'update-toast',
            duration: Number.POSITIVE_INFINITY,
            action: {
              label: 'Cancelar',
              onClick(e) {
                e.preventDefault()
                api.fetch('cancel-update', updateInfo)
              },
            },
          })
          api.fetch('update-download', updateInfo)
        },
      },
    })
  }, [])

  useApiEventHandler('update-download-progress', (info: ProgressInfo) => {
    toast(`Baixando atualização - ${Math.round(info.percent)}%`, {
      id: 'update-toast',
      duration: Number.POSITIVE_INFINITY,
    })
  }, [])

  useApiEventHandler<UpdateInfo>('update-downloaded', updateInfo => {
    toast(`Atualização baixada - Versão ${updateInfo.version}`, {
      id: 'update-toast',
      duration: Number.POSITIVE_INFINITY,
      action: {
        label: 'Fechar e Instalar',
        onClick(e) {
          e.preventDefault()
          window.close()
        },
      },
    })
  }, [])

  useApiEventHandler<{ type: WeekType, week: number, items: Exclude<typeof data, undefined>['items'] }>(`parsed-results/${weekNumber}`, (response) => {
    if (response.type === type && response.week === weekNumber)
      dispatch(weekApiEndpoints.util.upsertQueryData('fetchWeekMedia', { isoDate: currentWeekStart.toISOString(), type }, { items: response.items ?? [] }))
  }, [dispatch, currentWeekStart, type])

  const isFetchingData = isFetching || isRefreshing

  const hasFoundMedia = useMemo(() => data?.items?.some(it => !it.manual) ?? true, [data])

  const mediaGroups = useMemo(() => {
    const groups = Object.values(data?.items ?? []).map(it => it.group)

    const items = sortingItems ?? data?.items ?? []
    return !data
      ? {}
      : data.items.length || isFetchingData
        ? groups.reduce((acc, group) => ({
          ...acc,
          [group]: items.filter(item => item.group === group),
        }), {} as Record<string, ProcessedResult[]>)
        : { 'Cânticos': [] }
  }, [data, isFetchingData, sortingItems])

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
          const filename_l = file.name.toLowerCase()
          showDialog((
            <UploadMetadataDialog
              onSubmit={resolve}
              groups={Object.keys(mediaGroups)}
              defaultGroup={lastSelectedGroup.current}
              defaultLabel={file.name.replace(/\.[^.]+$/, '')}
              disableLabel={filename_l.endsWith('.jwpub') || filename_l.endsWith('.jwlplaylist')}
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

  const [sortingId, setSortingId] = useState<string>()

  const draggableSensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 20 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  function handleDragStart(e: DragStartEvent) {
    setSortingId(e.active.id.toString())
    setSortingItems(data?.items)
  }

  async function handleDragEnd() {
    setSortingId(undefined)
    if (!sortingItems)
      return

    console.log(sortingItems)
    await updateMetadata({
      isoDate: currentWeekStart.toISOString(),
      type,
      metadata: sortingItems,
    })

    setSortingItems(undefined)
  }

  async function handleDragOver(e: DragOverEvent) {
    const { active, over } = e

    const activeId = active.id.toString() ?? ''
    const overId = over?.id.toString() ?? ''

    if (!data || !sortingItems || !overId || !activeId)
      return

    const isOverGroup = overId.startsWith('group--')
    const overGroup = isOverGroup
      ? overId.replace('group--', '')
      : sortingItems.find(it => it.uid === overId)?.group

    const activeIndex = sortingItems.findIndex(it => it.uid === activeId)
    const overIndex = isOverGroup
      ? data.items.findIndex(it => it.group === overGroup)
      : sortingItems.findIndex(it => it.uid === overId)

    if (!overGroup || activeIndex === overIndex)
      return

    setSortingItems((items) => {
      if (!items || activeIndex < 0)
        return

      let $items = [...items]
      $items = items.map(item => item.uid !== activeId ? item : {
        ...item,
        group: overGroup,
      })
      
      return arrayMove($items, activeIndex, overIndex)
    })
  }

  const sortingItem = data?.items.find(it => it.uid === sortingId)

  return (
    <>
      <div className="h-screen overflow-hidden overflow-y-scroll">
        <DataTransferContainer onTransfer={handleDataTransfer} validFormats={['image/', 'audio/', 'video/', '.jwpub', '.jwlplaylist']} className="dark:bg-zinc-900 flex flex-col flex-1 w-full">
          <div className="flex flex-col p-10 min-h-screen">
            <div key={date.getTime()} className="flex flex-row items-center justify-start gap-3 -mx-2 mb-2">
              <button
                type="button"
                className="bg-transparent p-2 border-0 hover:opacity-80"
                onClick={createWeekChangeHandler('before')}
                title="Abrir a semana anterior"
              >
                <ChevronLeftIcon className="h-5" />
              </button>
              <h1 className="mb-0 cursor-default flex items-center gap-3">
                <button
                  type="button"
                  className="bg-transparent p-2 border-0 hover:opacity-80 disabled:opacity-40"
                  onClick={() => setDate(new Date())}
                  title="Abrir semana para hoje"
                  disabled={isToday}
                >
                  <CalendarDaysIcon className="h-5" />
                </button>

                Semana • {formatDate(currentWeekStart, 'dd/MM/yyyy')} - {formatDate(addDays(currentWeekStart, 6), 'dd/MM/yyyy')}

                <a href={getWOLWeekUrl(date)} target="_blank" className="-mt-3" title="Abrir na Biblioteca Online">
                  <ArrowTopRightOnSquareIcon className="h-4" />
                </a>
              </h1>
              <button
                type="button"
                className="bg-transparent p-2 border-0 hover:opacity-80"
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

            <DndContext
              sensors={draggableSensors}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragOver={handleDragOver}
              modifiers={[restrictToFirstScrollableAncestor]}
            >
              <div className="flex flex-wrap flex-col w-full">
                {isFetchingData && !data?.items.length && <div>Carregando mídias...</div>}

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
                    <SortableContext items={items.map(it => ({ ...it, id: it.uid }))}>
                      <Droppable group={group}>
                        {items.map(item => (
                          <SortableMediaItem
                            key={item.uid}
                            item={item}
                            type={type}
                            currentWeekStart={currentWeekStart}
                          />
                        ))}
                        {group.toLowerCase() === 'cânticos' && (
                          <button
                            type="button"
                            className={clsx(
                              'relative flex items-center justify-center',
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
                      </Droppable>
                    </SortableContext>
                  </details>
                ))}
              </div>
              <DragOverlay>
                {sortingItem
                  ? <MediaItem  
                    item={sortingItem}
                    type={type}
                    currentWeekStart={currentWeekStart}
                    dragging
                  />
                  : null}
              </DragOverlay>
            </DndContext>
          </div>

          <BibleWidget />
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

interface DroppableProps {
  group: string
}

function Droppable({ group, children }: PropsWithChildren<DroppableProps>) {
  const {
    setNodeRef,
  } = useDroppable({ id: `group--${group}` })

  return (
    <div ref={setNodeRef} className="flex flex-wrap w-full items-start gap-5 mt-3 mb-3" style={{ minHeight: 230 }}>
      {children}
    </div>
  )
}

export default MainApp
