import { Active, closestCorners, DndContext, DragOverEvent, DragOverlay, DragStartEvent, Modifier, Over, PointerSensor, useDroppable, useSensor, useSensors } from '@dnd-kit/core'
import { restrictToFirstScrollableAncestor, restrictToVerticalAxis } from '@dnd-kit/modifiers'
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ArrowPathIcon, ArrowTopRightOnSquareIcon, CalendarDaysIcon, ChevronLeftIcon, ChevronRightIcon, PlusIcon, XMarkIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'
import { addDays, addWeeks, format as formatDate, getWeek, isWeekend, startOfWeek } from 'date-fns'
import logger from 'electron-log/renderer'
import { ProgressInfo, type UpdateInfo } from 'electron-updater'
import { groupBy } from 'lodash'
import { MouseEventHandler, PropsWithChildren, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { ProcessedResult } from '../../electron/api/crawler/types'
import { type APIEvents } from '../../electron/events/api'
import { UploadingFile } from '../../shared/models/UploadMedia'
import { WeekType } from '../../shared/models/WeekType'
import { StorageKeys } from '../../shared/storage-keys'
import { getWOLWeekUrl } from '../../shared/utils'
import loadingGif from '../assets/loading.gif?asset'
import { useApiEventHandler } from '../hooks/useApiEventHandler'
import { useKeyboardNavigation } from '../hooks/useKeyboardNavigation'
import { useStorageValue } from '../hooks/useStorageValue'
import weekApiEndpoints, { useAddSongMutation, useFetchWeekMediaQuery, useLazyRefetchWeekMediaQuery, usePreloadMeetingMutation, useUpdateMetadataMutation, useUploadMediaMutation } from '../store/api/week'
import { useAppDispatch } from '../store/hooks'
import { playerActions } from '../store/player/slice'
import { BibleWidget } from './Bible/BibleWidget'
import { DataTransferContainer } from './DataTransferContainer/DataTransferContainer'
import { useDialog } from './Dialog/DialogProvider'
import { ItemGroup, SortableItemGroup } from './ItemGroup/ItemGroup'
import { MediaItem, SortableMediaItem } from './MediaItem/MediaItem'
import { PlayerInterface } from './PlayerInterface/PlayerInterface'
import { SelectSongDialog } from './SelectSongDialog/SelectSongDialog'
import { UploadMetadataDialog } from './UploadMetadataDialog/UploadMetadataDialog'

const noopModifier: Modifier = ({ transform }) => transform

const WEEK_TYPES = {
  [WeekType.MIDWEEK]: 'Reunião de Meio de Semana',
  [WeekType.WEEKEND]: 'Reunião de Fim de Semana',
}

function MainApp() {
  const dispatch = useAppDispatch()
  
  const [,startTransition] = useTransition()

  const { show: showDialog } = useDialog()

  useKeyboardNavigation()

  const [date, setDate] = useState(() => new Date())

  const [autoLoadNextMeeting, setAutoLoadNextMeeting] = useStorageValue<boolean>(StorageKeys.autoLoadNextMeeting)

  const currentWeekStart = useMemo(() => {
    return startOfWeek(date, { weekStartsOn: 1 })
  }, [date])
  const weekNumber = useMemo(() => getWeek(currentWeekStart, { weekStartsOn: 1 }), [currentWeekStart])

  const todayType = useMemo(() => isWeekend(new Date()) ? WeekType.WEEKEND : WeekType.MIDWEEK, [])
  const [type, setType] = useState(todayType)

  const isToday = useMemo(() => formatDate(date, 'yyyy-MM-dd') === formatDate(new Date(), 'yyyy-MM-dd') && type === todayType,[date, todayType, type])

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
      
        logger.log('Loading next meeting media', nextMeetingDate.toISOString(), WeekType[nextMeetingType])

        preloadMeeting({ isoDate: nextMeetingDate.toISOString(), type: nextMeetingType })
      }
    })()
  }, [currentWeekStart, hasFetchedWeekMedia, preloadMeeting, type])

  const [ uploadMedia, { isLoading: isUploading } ] = useUploadMediaMutation()
  const [ addSong, { isLoading: isAddingSong } ] = useAddSongMutation()
  const [ updateMetadata ] = useUpdateMetadataMutation()

  const lastSelectedGroup = useRef('Outros')

  const [songsAmount, setSongsAmount] = useState<number>()

  useEffect(() => {
    api.fetch<APIEvents.LoadSongsResponse>('songs/load')
      .then(setSongsAmount)
  }, [])

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

  const [sortingId, setSortingId] = useState<string>()

  const [sortingItem, sortingGroup] = useMemo((): [null, null] | [ProcessedResult, null] | [null, string] => {
    const sortingItem = data?.items.find(it => it.uid === sortingId) ?? null
    const sortingGroup = data?.items.reduce((group, item) =>
      group ?? (item.group === sortingId ? item.group : null)
    , null as string | null) ?? null

    if (sortingItem)
      return [sortingItem, null]
    else if (sortingGroup)
      return [null, sortingGroup]
    else
      return [null, null]
  }, [data?.items, sortingId])

  useEffect(() => {
    if (!sortingId) return

    document.body.classList.add('sorting')
    return () => document.body.classList.remove('sorting')
  }, [sortingId])

  const mediaGroups = useMemo(() => {
    const groups = [...new Set(Object.values((sortingGroup ? sortingItems : null) ?? data?.items ?? []).map(it => it.group))]

    const items = sortingItems ?? data?.items ?? []
    return items.length || isFetchingData
      ? groups.reduce((acc, group) => ({
        ...acc,
        [group]: items.filter(item => item.group === group),
      }), {} as Record<string, ProcessedResult[]>)
      : { 'Cânticos': [] }
  }, [data?.items, isFetchingData, sortingGroup, sortingItems])

  const createWeekChangeHandler = (action: 'before' | 'after'): MouseEventHandler => async (e) => {
    e.preventDefault()

    const toggleType = {
      [WeekType.MIDWEEK]: WeekType.WEEKEND,
      [WeekType.WEEKEND]: WeekType.MIDWEEK,
    }

    startTransition(() => {
      setType(toggleType[type])
  
      switch (action) {
        case 'before':
          if (type === WeekType.MIDWEEK)
            setDate(addWeeks(date, -1))
          break
        case 'after':
          if (type === WeekType.WEEKEND)
            setDate(addWeeks(date, 1))
          break
      }
    })
  }

  const createAddSongHandler = (group: string): MouseEventHandler => async (e) => {
    e.preventDefault()

    try {
      const song = await new Promise<number>((resolve, reject) => {
        showDialog((
          <SelectSongDialog
            songsAmount={songsAmount ?? 200}
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
              disableLabel={['.jwpub', '.jwlplaylist'].some(ext => filename_l.endsWith(ext))}
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

  const draggableSensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 20 },
    }),
  )

  function handleDragStart(e: DragStartEvent) {
    setSortingId(e.active.id.toString())
    setSortingItems(data?.items)
  }

  async function handleDragOver(e: DragOverEvent) {
    const { active, over } = e

    if (!over || !sortingItems) return

    const activeId = String(active.id)
    const overId = String(over?.id ?? '')

    const activeGroup = sortingItems.find(it => [it.uid,it.group].includes(activeId))?.group ?? ''
    const overGroup = sortingItems.find(it => [it.uid,it.group].includes(overId))?.group ?? ''

    if (/c.nticos/i.test(overGroup) && overGroup !== activeGroup)
      return

    if (active.data.current?.type === 'item') {
      return handleSortItems(active, over)
    }
    if (active.data.current?.type === 'group') {
      return handleSortGroups(activeId, over)
    }
  }

  function handleSortItems(active: Active, over: Over) {
    if (!sortingItems || !data) return

    const activeId = String(active.id)
    const overId = String(over.id)

    const activeIndex = sortingItems.findIndex(it => it.uid === activeId)
    const activeGroup = active.data.current?.group
    const originalActiveGroup = data.items.find(it => it.uid === activeId)?.group ?? ''

    const overIndex = sortingItems.findIndex(it => it.uid === overId || it.group === overId)
    const isOverGroup = over.data.current?.type === 'group'
    const overGroup = isOverGroup ? String(over.id) : sortingItems[overIndex].group

    // static per sorting
    const isGroupInRisk = data.items.filter(it => it.group === originalActiveGroup).length <= 1

    setSortingItems(items => {
      let $items = [...items ?? []]
      $items = $items.flatMap(it => {
        if (it.uid !== activeId) return it
        return [
          { ...it, group: overGroup },
        ]
      }).filter((it): it is Exclude<typeof it, boolean> => !!it)
      if (isGroupInRisk) {
        if ([activeGroup, overGroup].includes(originalActiveGroup))
          $items = $items.filter(it => it.uid !== 'placeholder')
        if (originalActiveGroup === activeGroup && originalActiveGroup !== overGroup)
          $items = $items.concat([{ uid: 'placeholder', alt: '', group: activeGroup, label: '', manual: false, media: [], type: 'image' }])
      }
      return arrayMove($items ?? [], activeIndex, overIndex)
    })
  }

  function handleSortGroups(activeGroup: string, over: Over) {
    if (!data || over.data.current?.type !== 'group') return

    const groups = Object.keys(groupBy(data.items, it => it.group))

    const activeIndex = groups.indexOf(activeGroup)
    const overGroup = String(over.id)
    const overIndex = groups.indexOf(overGroup)

    if (overGroup !== activeGroup && /c.nticos/i.test(overGroup)) return

    const sortedGroups = arrayMove(groups, activeIndex, overIndex)

    setSortingItems(items => {
      return [...items ?? []].sort((a, b) => {
        const aGroupIndex = sortedGroups.indexOf(a.group)
        const bGroupIndex = sortedGroups.indexOf(b.group)
        return aGroupIndex - bGroupIndex
      }) ?? []
    })
  }

  async function handleDragEnd() {
    if (sortingItems) {
      setSortingItems(undefined)
      await updateMetadata({
        isoDate: currentWeekStart.toISOString(),
        type,
        metadata: sortingItems.filter(it => it.uid !== 'placeholder'),
      })
    }
    setSortingId(undefined)
  }

  return (
    <>
      <div className="h-screen overflow-hidden overflow-y-scroll">
        <DataTransferContainer onTransfer={handleDataTransfer} validFormats={['image/', 'audio/', 'video/', '.jwpub', '.jwlplaylist']} className="dark:bg-zinc-900 flex flex-col flex-1 w-full">
          <div className="flex flex-col p-10 min-h-screen">
            <div key={date.getTime()} className="flex flex-row items-center justify-start -ml-3 gap-3 mb-2">
              <h1 className="mb-0 cursor-default flex items-center gap-3">
                <button
                  type="button"
                  className="bg-transparent p-2 border-0 hover:opacity-80 disabled:opacity-40"
                  onClick={() => {
                    startTransition(() => {
                      setType(todayType)
                      setDate(new Date())
                    })
                  }}
                  title="Abrir semana para hoje"
                  disabled={isToday}
                >
                  <CalendarDaysIcon className="h-5" />
                </button>

                <span>Semana • {formatDate(currentWeekStart, 'dd/MM/yyyy')} - {formatDate(addDays(currentWeekStart, 6), 'dd/MM/yyyy')}</span>

                <a href={getWOLWeekUrl(date)} target="_blank" className="block -mt-3" title="Abrir na Biblioteca Online">
                  <ArrowTopRightOnSquareIcon className="h-4" />
                </a>

                <button
                  type="button"
                  className="bg-transparent p-2 border-0 hover:opacity-80"
                  onClick={createWeekChangeHandler('before')}
                  title="Visualizar reunião anterior"
                >
                  <ChevronLeftIcon className="h-5" />
                </button>
                <small className="relative text-sm top-0.5 border py-2 px-4">{WEEK_TYPES[type]}</small>
                <button
                  type="button"
                  className="bg-transparent p-2 border-0 hover:opacity-80"
                  onClick={createWeekChangeHandler('after')}
                  title="Visualizar próxima reunião"
                >
                  <ChevronRightIcon className="h-5" />
                </button>
              </h1>

              <div className="flex items-center ml-auto mr-0">
                <button
                  type="button"
                  onClick={handleRefreshData}
                  className="flex items-center ml-auto p-2 px-4 bg-transparent border enabled:hover:bg-zinc-500/50 disabled:opacity-50 transition-colors"
                  disabled={isFetchingData}
                >
                  Recarregar
                  <ArrowPathIcon className="h-5 ml-1.5 data-[loading=true]:animate-spin" data-loading={isFetchingData} />
                </button>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <label className="flex flex-row flex-initial ml-auto items-center gap-3">
                <span className="text-sm italic">Pré-carregar próxima reunião</span>
                <input
                  type="checkbox"
                  checked={autoLoadNextMeeting}
                  onChange={() => setAutoLoadNextMeeting(value => !value)}
                  style={{ appearance: 'checkbox' }}
                />
              </label>
            </div>

            <DndContext
              sensors={draggableSensors}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragOver={handleDragOver}
              modifiers={[restrictToFirstScrollableAncestor]}
              collisionDetection={closestCorners}
            >
              <SortableContext items={data?.items.map(it => ({ ...it, id: it.uid })) ?? []} strategy={verticalListSortingStrategy}>
                <Droppable group='main'>
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
                      <SortableItemGroup group={group} key={group} open disableSorting={/c.nticos/i.test(group)}>
                        <SortableContext items={items.map(it => ({ ...it, id: it.uid }))} id={group}>
                          <Droppable group={group}>
                            {items.map(item => (
                              item.uid === 'placeholder'
                                ? <SortablePlaceholder className="w-[180px] h-[200px]" />
                                : <SortableMediaItem
                                  key={item.uid}
                                  item={item}
                                  type={type}
                                  currentWeekStart={currentWeekStart}
                                  placeholder={item.uid === 'placeholder'}
                                />
                            ))}
                            {/c.nticos/i.test(group) && (
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
                      </SortableItemGroup>
                    ))}
                  </div>
                </Droppable>
              </SortableContext>
              <DragOverlay
                dropAnimation={null}
                modifiers={[
                  restrictToFirstScrollableAncestor,
                  sortingGroup ? restrictToVerticalAxis : noopModifier,
                ]}
              >
                {sortingItem && (
                  <MediaItem
                    item={sortingItem}
                    type={type}
                    currentWeekStart={currentWeekStart}
                    dragging
                  />
                )}
                {sortingGroup && (
                  <ItemGroup group={sortingGroup} className="w-full opacity-50" id={sortingGroup} />
                )}
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
    over,
  } = useDroppable({ id: group, data: { type: 'group' } })

  const isOver = group !== 'main' && over?.data.current?.sortable?.containerId === group

  return (
    <div
      ref={setNodeRef}
      id={group}
      className={clsx('flex flex-wrap items-start gap-5 -mx-4 p-4', isOver && 'bg-zinc-800/5')}
      style={{ minHeight: 230 }}
    >
      {children}
    </div>
  )
}

function SortablePlaceholder({ className, children, ...props }: React.ComponentProps<'div'>) {
  const {
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({
    id: 'placeholder',
  })

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...props}
      className={clsx('invisible', className)}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
    >{children}</div>
  )
}

export default MainApp
