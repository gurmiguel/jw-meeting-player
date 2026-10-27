import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { PhotoIcon, SpeakerWaveIcon, VideoCameraIcon, XMarkIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'
import { ComponentType, MouseEvent, createElement, useCallback, useEffect, useRef, useState } from 'react'
import type { ParsedMedia, ProcessedResult } from '../../../electron/api/crawler/types'
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
import { ZoomingImage } from '../ZoomingImage/ZoomingImage'

interface MediaItemProps {
  item: ProcessedResult
  type: WeekType
  currentWeekStart: Date
  dragging?: boolean
  placeholder?: boolean
  onEdit?: (item: ProcessedResult) => void
}

interface ContextMenuPosition {
  left: number
  top: number
}

const mediaIcons: Record<MediaItemType['type'], ComponentType<any>> = {
  image: PhotoIcon,
  audio: SpeakerWaveIcon,
  video: VideoCameraIcon,
  text: () => <></>,
}

const mediaTips: Record<MediaItemType['type'], string> = {
  image: 'Imagem',
  audio: 'Áudio',
  video: 'Vídeo',
  text: 'Texto',
}

export function MediaItem({ item, type, currentWeekStart, dragging = false, onEdit }: MediaItemProps) {
  const promptConfirm = useConfirmDialog()

  const dispatch = useAppDispatch()

  const currentPlayingFile = useAppSelector(state => state.player.file)

  const [ removeMedia ] = useRemoveMediaMutation()
  const [ updateMediaProgress ] = useUpdateMediaProgressMutation()
  const [contextMenuPosition, setContextMenuPosition] = useState<ContextMenuPosition>()
  const contextMenuRef = useRef<HTMLDivElement>(null)

  const mainMedia = item.media[0] as ParsedMedia

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

  async function removeMediaHandler() {
    if (await promptConfirm('Deseja realmente excluir este item?')) {
      await removeMedia({ isoDate: currentWeekStart.toISOString(), type, item })

      if (currentPlayingFile === mainMedia.path)
        dispatch(playerActions.stop())
    }
  }

  function mediaRemoveHandler(e: MouseEvent) {
    e.preventDefault()
    void removeMediaHandler()
  }

  function mediaContextMenuHandler(e: MouseEvent<HTMLDivElement>) {
    if (!item.manual) return

    e.preventDefault()
    e.stopPropagation()
    setContextMenuPosition({
      left: Math.min(e.clientX, window.innerWidth - 160),
      top: Math.min(e.clientY, window.innerHeight - 96),
    })
  }

  useEffect(() => {
    if (!contextMenuPosition) return

    const controller = new AbortController()
    const closeMenu = (e: PointerEvent) => {
      if (!contextMenuRef.current?.contains(e.target as Node))
        setContextMenuPosition(undefined)
    }
    const closeOnEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setContextMenuPosition(undefined)
    }

    document.addEventListener('pointerdown', closeMenu, { signal: controller.signal })
    document.addEventListener('keydown', closeOnEscape, { signal: controller.signal })

    return () => controller.abort()
  }, [contextMenuPosition])

  const downloadProgress = mainMedia.downloadProgress ?? 100
  const downloadFinished = useDebounceValue(downloadProgress === 100, 250)
  const coverMedia = !downloadFinished ? loadingGif : item.media.find((it): it is ParsedMedia => it.type === 'image')

  return (
    <div
      title={item.alt}
      className={clsx('relative w-[180px]', !downloadFinished && 'opacity-70 pointer-events-none', dragging && 'opacity-30 grayscale')}
      onContextMenu={mediaContextMenuHandler}
    >
      <a href="#" onClick={mediaOpenHandler} className="relative flex w-full bg-black transition duration-300 [&:not(:has(.image-resized))]:hover:shadow-md [&:not(:has(.image-resized))]:hover:shadow-slate-700/50 group" data-arrow-nav="xy">
        <div className="relative overflow-hidden h-[180px] aspect-square">
          {item.type === 'audio'
            ? <AudioPlaceholder file={mainMedia.path} />
            : <ZoomingImage src={getMediaCoverPath(coverMedia)} alt="" className="pointer-events-none" fromParent />}
        </div>
        <div className="absolute top-2 right-2 icon-shadow">
          {createElement(mediaIcons[item.type], { className: 'h-6 text-zinc-100', strokeWidth: 1.5, alt: mediaTips[item.type] })}
        </div>
        <ProgressBar progress={downloadProgress} className="absolute-center top-auto bottom-2 w-11/12" />
        {downloadFinished && mainMedia.duration && (
          <div className="absolute bottom-0 right-0 shadow-sm px-1.5 font-semibold text-white bg-zinc-800">
            {formatDuration(mainMedia.duration)}
          </div>
        )}
      </a>
      {item.manual && (
        <button className="absolute top-2 left-2 bg-transparent icon-shadow" title="Excluir" type="button" onClick={mediaRemoveHandler}>
          <XMarkIcon className="h-6 text-red-700" strokeWidth="3" />
        </button>
      )}
      <p title={item.label} className="cursor-default text-sm w-full mt-1.5 line-clamp-3 leading-5">{item.label}</p>
      {contextMenuPosition && (
        <div
          ref={contextMenuRef}
          role="menu"
          className="fixed z-20 min-w-36 border border-zinc-600 bg-zinc-900 py-1 shadow-lg"
          style={contextMenuPosition}
        >
          {!/c.nticos/i.test(item.group) && (
            <button
              type="button"
              role="menuitem"
              className="block w-full bg-transparent px-3 py-1.5 text-left hover:bg-zinc-700"
              onClick={() => {
                setContextMenuPosition(undefined)
                onEdit?.(item)
              }}
            >Editar</button>
          )}
          <button
            type="button"
            role="menuitem"
            className="block w-full bg-transparent px-3 py-1.5 text-left text-red-400 hover:bg-zinc-700"
            onClick={() => {
              setContextMenuPosition(undefined)
              void removeMediaHandler()
            }}
          >Remover</button>
        </div>
      )}
    </div>
  )
}

export function SortableMediaItem(props: Omit<MediaItemProps, 'dragging'>) {
  const isPlaceholderItem = props.item.uid.endsWith('--placeholder') || props.placeholder
  const {
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({
    id: props.item.uid,
    disabled: isPlaceholderItem,
    data: { type: 'item', group: props.item.group },
  })

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        ...(isPlaceholderItem ? {
          opacity: 0,
          width: !props.placeholder ? 1 : undefined,
        } : {}),
      }}
    >
      <MediaItem {...props} />
    </div>
  )
}

function getMediaCoverPath(media: string | ParsedMedia | undefined) {
  if (!media || typeof media === 'string') return media

  if (!media.timestamp) return media.path

  return `${media.path}?_=${media.timestamp}`
}
