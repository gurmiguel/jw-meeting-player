import { MagnifyingGlassPlusIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { addListener } from '@reduxjs/toolkit'
import clsx from 'clsx'
import { MouseEvent, useEffect, useRef, useState } from 'react'
import zoomIcon from '../../assets/zoom-icon.png'
import { useDraggable } from '../../hooks/useDraggable'
import { useMeasure } from '../../hooks/useMeasure'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { initialState as initialPlayer, playerActions } from '../../store/player/slice'
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

  function handleMirrorZoomScreen(e: MouseEvent) {
    e.preventDefault()

    dispatch(playerActions.toggleZoomScreen())
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
              <img src={zoomIcon} className="size-8" />
            </button>
          )}
        </div>
      </div>
    </Resizer>
  )
}
