import { MagnifyingGlassPlusIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { addListener } from '@reduxjs/toolkit'
import clsx from 'clsx'
import { MouseEvent, useEffect, useRef, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { APIEvents } from '../../../electron/events/api'
import LoadingIcon from '../../assets/loading.svg?react'
import zoomIcon from '../../assets/zoom-icon.png'
import { useDraggable } from '../../hooks/useDraggable'
import { useMeasure } from '../../hooks/useMeasure'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { initialState as initialPlayer, playerActions } from '../../store/player/slice'
import { useDialog } from '../Dialog/DialogProvider'
import { Resizer } from '../Resizer/Resizer'
import { ZoomTool } from '../ZoomTool/ZoomTool'

interface Props {
  sourceId: string | null
  handleClose(): void
}

const ASPECT_RATIO = 16 / 9
const RESOLUTION = 480
const height = 270
const width = height * ASPECT_RATIO

export function FeedbackScreen({ sourceId, handleClose }: Props) {
  const dispatch = useAppDispatch()
  
  const video = useRef<HTMLVideoElement>(null)
  const image = useRef<HTMLImageElement>(null)

  const media = useAppSelector(state => ({
    type: state.player.type,
    file: state.player.file,
  }))

  const isSharingZoom = useAppSelector(state => state.player.sharingZoom)

  const [isFetchingZoomWindows, startFetchingZoomWindows] = useTransition()

  const { show: showDialog, hide: hideDialog } = useDialog()
  
  const [stream, setStream] = useState<MediaStream>()

  const [zoomMode, setZoomMode] = useState(false)

  const [dragHandlers, dragging] = useDraggable<HTMLDivElement>({ gutter: 8, disabled: zoomMode === true })

  const imageSize = useMeasure(zoomMode ? image : null)

  const showStreamFeedback = !!sourceId && !zoomMode

  useEffect(() => {
    if (!showStreamFeedback) return

    navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        // @ts-ignore
        mandatory: {
          chromeMediaSource: 'desktop',
          chromeMediaSourceId: sourceId,
          maxWidth: RESOLUTION * ASPECT_RATIO,
          maxHeight: RESOLUTION,
          frameRate: { max: 10 },
        },
      },
    }).then(stream => {
      setStream(stream)
    })
    
    return () => {
      setStream(undefined)
    }
  }, [showStreamFeedback, sourceId])

  useEffect(() => {
    if (!video.current || !stream) return

    video.current.srcObject = stream
  }, [stream])

  function handleZoomToggle(e: MouseEvent) {
    e.preventDefault()
    e.nativeEvent.stopImmediatePropagation()

    setZoomMode(it => !it)
    dispatch(playerActions.zoomLevel({ zoomLevel: initialPlayer.zoomLevel, position: initialPlayer.position }))
  }

  async function handleMirrorZoomScreen(e: MouseEvent) {
    e.preventDefault()

    if (isSharingZoom)
      return dispatch(playerActions.toggleZoomScreen(false))

    const windows = await new Promise<APIEvents.GetZoomScreenIdResponse | null>(resolve => {
      startFetchingZoomWindows(async () => {
        try {
          resolve(await api.fetch<APIEvents.GetZoomScreenIdResponse>('get-zoom-screen', null))
        } catch { resolve(null) }
      })
    })

    if (!windows) {
      return toast.warning('Não foi possível obter as janelas do Zoom', {
        duration: 3_000,
      })
    }

    const id = showDialog((
      <div className="flex flex-col gap-4 items-center">
        <h2 className="text-xl font-semibold">Selecione a janela do Zoom para espelhar:</h2>
        <div className="flex justify-center gap-2 p-4">
          {windows.map(win => (
            <button key={win.id}
              type="button"
              className="flex flex-col pt-2 bg-slate-900/80 border border-white/20 rounded cursor-pointer hover:opacity-60 transition-opacity"
              onClick={() => {
                hideDialog(id)
                dispatch(playerActions.toggleZoomScreen(win.id))
              }}
            >
              <span className="text-sm">{win.name}</span>
              <img src={URL.createObjectURL(new Blob([win.thumbnail as never], { type: 'image/png' }))} alt={win.name} className="object-contain aspect-video h-72" />
            </button>
          ))}
        </div>
        <button type="button" className="px-6 py-2 border border-white/20 bg-transparent hover:bg-white/10 transition" onClick={() => hideDialog(id)}>
          Cancelar
        </button>
      </div>
    ), {
      className: 'max-w-[80vw]',
    })
  }

  useEffect(() => {
    return dispatch(addListener({
      actionCreator: playerActions.stop,
      effect() {
        setZoomMode(false)
      },
    }))
  }, [dispatch])

  return (
    <Resizer gutter={8} disabled={zoomMode === true} enableMaximizeOnDblClick={dragHandlers.isDefaultPosition}>
      <div
        {...dragHandlers}
        className={clsx([
          'fixed z-10 rounded-md overflow-hidden',
          dragging && 'cursor-grabbing',
          !zoomMode && 'bottom-2 right-2 bg-black cursor-grab',
          zoomMode && 'absolute-center aspect-video flex items-center justify-center mt-4 p-4 bg-zinc-800',
        ])} 
        style={!zoomMode ? { width, height } : { height: 'calc(100% - 5.5rem)' }}
      >
        {showStreamFeedback && (
          <video
            ref={video}
            onLoadedMetadata={() => video.current?.play()}
            className="block w-full h-full object-contain"
          />
        )}

        {zoomMode && (
          <>
            <img
              ref={image}
              src={media.file ?? ''}
              className={clsx([
                'block object-contain aspect-video',
                imageSize.mode === 'landscape' && 'w-full',
                imageSize.mode === 'portrait' && 'h-full',
              ])}
            />
            {imageSize.height !== -Infinity && <ZoomTool gutter={16} />}
          </>
        )}

        <div className="controls absolute flex top-4 left-4 right-4 z-10">
          {media.type === 'image' && (
            <button type="button" className="p-2 icon-shadow transition bg-transparent" onClick={handleZoomToggle}>
              {!zoomMode
                ? <MagnifyingGlassPlusIcon className="h-6" />
                : <XMarkIcon className="h-6" />}
            </button>
          )}

          {(['image', 'video', 'text'] as (typeof media.type)[]).includes(media.type) && !zoomMode && (
            <>
              <button type="button" className="ml-auto p-2 icon-shadow transition bg-transparent" onClick={handleClose}>
                <XMarkIcon className="h-6" />
              </button>
            </>
          )}
        </div>

        <div className="controls absolute flex bottom-2 right-2 z-10">
          {!zoomMode && !media.type && (
            <button type="button" className="ml-auto p-2 icon-shadow transition bg-transparent" onClick={handleMirrorZoomScreen}>
              {!isFetchingZoomWindows
                ? <img src={zoomIcon} className="size-8" />
                : <LoadingIcon className="size-8" />}
            </button>
          )}
        </div>
      </div>
    </Resizer>
  )
}
